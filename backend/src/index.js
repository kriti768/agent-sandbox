import express from 'express';
import cors from 'cors';
import http from 'http';
import { v4 as uuidv4 } from 'uuid';
import { config } from './config.js';
import { connectDatabase, saveAgent, saveExecution, getAgents, getExecutions } from './db.js';
import { connectQueue, publishTask, queueEvents } from './queue.js';
import { initializeWebSocketServer, broadcastLog } from './ws.js';
import { generateCodeWithAI } from './gemini.js';
import { SandboxRunner } from './docker.js';

const app = express();
app.use(cors());
app.use(express.json());

// Main HTTP Server wrapper for WebSocket upgrade hooks
const server = http.createServer(app);

// REST API endpoints
app.get('/api/agents', async (req, res) => {
  try {
    const agents = await getAgents();
    res.json(agents);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/agents', async (req, res) => {
  const { name, systemInstruction } = req.body;
  if (!name || !systemInstruction) {
    return res.status(400).json({ error: 'Name and systemInstruction are required parameters.' });
  }
  try {
    const agent = await saveAgent(name, systemInstruction);
    res.status(201).json(agent);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/executions', async (req, res) => {
  try {
    const executions = await getExecutions();
    res.json(executions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/executions/run', async (req, res) => {
  const { agentId, taskInput, language } = req.body;
  
  if (!agentId || !taskInput || !language) {
    return res.status(400).json({ error: 'agentId, taskInput, and language (python/javascript) are required.' });
  }

  try {
    const executionId = uuidv4();
    
    // Publish task to RabbitMQ for event-driven processing
    await publishTask(executionId, agentId, taskInput, language);
    
    res.status(202).json({
      message: 'Task successfully enqueued to broker.',
      executionId
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Event-driven Task Queue Consumer logic
queueEvents.on('task', async (task) => {
  const { executionId, agentId, taskInput, language } = task;
  
  console.log(`[ORCHESTRATOR] Received task job: ${executionId} (Agent: ${agentId})`);
  broadcastLog(executionId, `[SYSTEM] Task received. Initiating AI code generation pipeline...\n`);

  let finalStatus = 'failed';
  let accumulatedLogs = '';
  let generatedCode = '';

  const logCollector = (text) => {
    accumulatedLogs += text;
    broadcastLog(executionId, text);
  };

  try {
    // 1. Resolve agent instructions
    const agents = await getAgents();
    const agent = agents.find(a => a.id === agentId);
    const systemInstruction = agent ? agent.system_instruction : 'You write scripts to accomplish tasks.';

    // 2. Generate Code with Gemini (or Mock fallback)
    generatedCode = await generateCodeWithAI(systemInstruction, taskInput, language);
    
    logCollector(`[SYSTEM] AI successfully generated execution script:\n--------------------\n${generatedCode}\n--------------------\n`);

    // 3. Run script in isolated Docker Sandbox
    const runner = new SandboxRunner(language, generatedCode, executionId);
    runner.on('log', (data) => logCollector(data));

    const runResult = await runner.run();
    finalStatus = runResult;
  } catch (err) {
    logCollector(`\n[SYSTEM FATAL ERROR] Pipeline orchestration failed: ${err.message}\n`);
    finalStatus = 'failed';
  } finally {
    // 4. Persist run details to PostgreSQL/SQLite storage
    try {
      await saveExecution(agentId, language, generatedCode, finalStatus, accumulatedLogs);
      console.log(`[ORCHESTRATOR] Saved execution metrics for run ${executionId}`);
    } catch (dbErr) {
      console.error('[ORCHESTRATOR ERROR] Failed to store execution logs in database:', dbErr.message);
    }
  }
});

// Bootstrapper function
async function main() {
  console.log('[SYSTEM] Starting Agent Sandbox service...');
  
  // Connect dependencies
  await connectDatabase();
  await connectQueue();
  
  // Attach websockets
  initializeWebSocketServer(server);
  
  server.listen(config.port, () => {
    console.log(`[SYSTEM] Orchestrator Server listening on HTTP/WS port ${config.port}`);
  });
}

main().catch(err => {
  console.error('[SYSTEM CRITICAL] Orchestrator crashed on start:', err);
  process.exit(1);
});
