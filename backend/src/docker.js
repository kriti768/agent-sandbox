import Docker from 'dockerode';
import { EventEmitter } from 'events';

// Connect to Docker daemon. On Windows, Docker Desktop uses the named pipe: //./pipe/docker_engine.
// Dockerode handles this automatically by default.
const docker = new Docker();

export class SandboxRunner extends EventEmitter {
  constructor(language, code, executionId) {
    super();
    this.language = language; // 'python' or 'javascript'
    this.code = code;
    this.executionId = executionId;
  }

  async run() {
    const imageName = this.language === 'python' ? 'python:3.10-slim' : 'node:18-alpine';
    let cmd = [];

    if (this.language === 'python') {
      cmd = ['python', '-u', '-c', this.code]; // -u enables unbuffered output
    } else if (this.language === 'javascript') {
      cmd = ['node', '-e', this.code];
    } else {
      throw new Error(`Unsupported execution language: ${this.language}`);
    }

    try {
      this.emit('log', `[SYSTEM] Initializing isolated Docker sandbox (${imageName})...\n`);

      // Verify if image is available, otherwise pull it
      try {
        await docker.getImage(imageName).inspect();
      } catch (err) {
        this.emit('log', `[SYSTEM] Image ${imageName} not found locally. Pulling image (this may take a minute first time)...\n`);
        const pullStream = await docker.pull(imageName);
        await new Promise((resolve, reject) => {
          docker.modem.followProgress(pullStream, (err, res) => {
            if (err) reject(err);
            else resolve(res);
          });
        });
        this.emit('log', `[SYSTEM] Image ${imageName} successfully pulled.\n`);
      }

      // Create container with tight resource constraints and complete network isolation
      const container = await docker.createContainer({
        Image: imageName,
        Cmd: cmd,
        NetworkDisabled: true, // Block all egress and ingress network calls
        HostConfig: {
          Memory: 64 * 1024 * 1024, // Limit RAM to 64MB
          NanoCPUs: 500000000,      // Limit CPU usage to 0.5 cores
          AutoRemove: false,        // Allow us to retrieve status code and logs before removal
        },
      });

      this.emit('log', `[SYSTEM] Container instantiated: ${container.id.substring(0, 12)}. Booting...\n`);
      await container.start();

      // Attach stdout/stderr streams
      const logStream = await container.logs({
        follow: true,
        stdout: true,
        stderr: true,
      });

      // Demultiplex raw container streams into text events
      container.modem.demuxStream(
        logStream,
        { write: (data) => this.emit('log', data.toString('utf8')) },
        { write: (data) => this.emit('log', `[STDERR] ${data.toString('utf8')}`) }
      );

      // Wait for process completion
      const waitResult = await container.wait();
      this.emit('log', `\n[SYSTEM] Sandbox execution halted. Return code: ${waitResult.StatusCode}\n`);

      // Cleanup
      await container.remove();
      this.emit('log', `[SYSTEM] Sandbox cleaned and resource boundaries decommissioned.\n`);
      
      return waitResult.StatusCode === 0 ? 'success' : 'failed';
    } catch (err) {
      this.emit('log', `[FATAL] Sandbox Execution Error: ${err.message}\n`);
      throw err;
    }
  }
}
