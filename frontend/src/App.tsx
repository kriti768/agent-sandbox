import React, { useState, useEffect, useRef } from 'react';
import { 
  Cpu, 
  Play, 
  Layers, 
  Plus, 
  RefreshCw, 
  Activity, 
  ChevronRight, 
  History,
  Info
} from 'lucide-react';

const API_BASE = 'http://localhost:5000/api';
const WS_BASE = 'ws://localhost:5000/ws';

interface Agent {
  id: string;
  name: string;
  system_instruction: string;
  created_at: string;
}

interface Execution {
  id: string;
  agent_id: string;
  language: string;
  code: string;
  status: string;
  logs: string;
  created_at: string;
}

export default function App() {
  // State variables
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [taskInput, setTaskInput] = useState<string>('Find all prime numbers up to 50');
  const [language, setLanguage] = useState<string>('python');
  
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [selectedExecution, setSelectedExecution] = useState<Execution | null>(null);
  
  const [newAgentName, setNewAgentName] = useState<string>('');
  const [newAgentInstruction, setNewAgentInstruction] = useState<string>('');
  const [showCreateForm, setShowCreateForm] = useState<boolean>(false);

  const [activeLogStream, setActiveLogStream] = useState<string>('');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [backendStatus, setBackendStatus] = useState<'online' | 'offline'>('online');
  const [websocketActive, setWebsocketActive] = useState<boolean>(false);
  const [currentExecutionId, setCurrentExecutionId] = useState<string | null>(null);
  
  // Simulation mode fallback for demo portability
  const [simulationMode, setSimulationMode] = useState<boolean>(false);

  const terminalEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Auto-scroll terminal logs
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeLogStream]);

  // Load Agents & Executions
  const fetchData = async () => {
    try {
      const agentsRes = await fetch(`${API_BASE}/agents`);
      if (agentsRes.ok) {
        const agentsData = await agentsRes.json();
        setAgents(agentsData);
        if (agentsData.length > 0 && !selectedAgentId) {
          setSelectedAgentId(agentsData[0].id);
        }
      }

      const execsRes = await fetch(`${API_BASE}/executions`);
      if (execsRes.ok) {
        const execsData = await execsRes.json();
        setExecutions(execsData);
      }
      setBackendStatus('online');
    } catch (err) {
      console.warn('Backend is offline. Running in sandbox simulated mode.');
      setBackendStatus('offline');
      
      // Fallback mocks
      if (agents.length === 0) {
        setAgents([
          {
            id: 'mock-agent-1',
            name: 'Standard Python Math Agent',
            system_instruction: 'You write Python scripts to solve math tasks.',
            created_at: new Date().toISOString()
          },
          {
            id: 'mock-agent-2',
            name: 'Algorithms Specialist JS',
            system_instruction: 'You write JavaScript scripts to explain data sorting algorithms.',
            created_at: new Date().toISOString()
          }
        ]);
        setSelectedAgentId('mock-agent-1');
      }
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 8000);
    return () => clearInterval(interval);
  }, [selectedAgentId]);

  // Handle Agent Creation
  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAgentName || !newAgentInstruction) return;

    if (backendStatus === 'offline') {
      const newMock: Agent = {
        id: `mock-agent-${Date.now()}`,
        name: newAgentName,
        system_instruction: newAgentInstruction,
        created_at: new Date().toISOString()
      };
      setAgents(prev => [newMock, ...prev]);
      setSelectedAgentId(newMock.id);
      setNewAgentName('');
      setNewAgentInstruction('');
      setShowCreateForm(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/agents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newAgentName, systemInstruction: newAgentInstruction }),
      });
      if (res.ok) {
        const agent = await res.json();
        setAgents(prev => [agent, ...prev]);
        setSelectedAgentId(agent.id);
        setNewAgentName('');
        setNewAgentInstruction('');
        setShowCreateForm(false);
      }
    } catch (err) {
      console.error('Failed to create agent:', err);
    }
  };

  // Close active WS on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  // Start executing the agent job
  const handleLaunchExecution = async () => {
    if (!selectedAgentId || isRunning) return;

    setIsRunning(true);
    setActiveLogStream('[SYSTEM] Preparing task queue payload...\n');
    setSelectedExecution(null);
    setWebsocketActive(false);

    const selectedAgentObj = agents.find(a => a.id === selectedAgentId);

    // Simulation fallback
    if (backendStatus === 'offline' || simulationMode) {
      simulateLocalExecution(selectedAgentObj?.system_instruction || '');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/executions/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: selectedAgentId,
          taskInput,
          language
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to schedule job with backend.');
      }

      const data = await res.json();
      const executionId = data.executionId;
      setCurrentExecutionId(executionId);

      // Connect socket
      connectWebsocket(executionId);

    } catch (err: any) {
      setActiveLogStream(prev => prev + `[ERROR] Connection failed: ${err.message}\n[SYSTEM] Deploying local browser simulation...\n`);
      simulateLocalExecution(selectedAgentObj?.system_instruction || '');
    }
  };

  const connectWebsocket = (executionId: string) => {
    if (wsRef.current) wsRef.current.close();

    const socketUrl = `${WS_BASE}/logs/${executionId}`;
    const ws = new WebSocket(socketUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setWebsocketActive(true);
      setActiveLogStream(prev => prev + `[WEBSOCKET] Subscribed to real-time orchestrator stream.\n`);
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.event === 'log' || payload.event === 'system') {
          setActiveLogStream(prev => prev + payload.data);
        }
      } catch (err) {
        setActiveLogStream(prev => prev + event.data);
      }
    };

    ws.onclose = () => {
      setWebsocketActive(false);
      setIsRunning(false);
      setActiveLogStream(prev => prev + `\n[SYSTEM] Connection terminated by remote host.\n`);
      fetchData(); // Refresh history
    };

    ws.onerror = (err) => {
      console.error('WebSocket Error:', err);
      setActiveLogStream(prev => prev + `[ERROR] Connection socket error.\n`);
    };
  };

  // Local browser mock compiler execution simulator
  const simulateLocalExecution = (systemInstruction: string) => {
    let step = 0;
    const interval = setInterval(() => {
      step++;
      if (step === 1) {
        setActiveLogStream(prev => prev + `[SIMULATOR] Booting mock agent environment...\n`);
      } else if (step === 2) {
        setActiveLogStream(prev => prev + `[SIMULATOR] System context set: "${systemInstruction}"\n`);
      } else if (step === 3) {
        setActiveLogStream(prev => prev + `[SIMULATOR] Querying Gemini AI model for script compilation...\n`);
      } else if (step === 4) {
        const mockCode = language === 'python' 
          ? `def solve():\n    print("Executing sandbox python module...")\n    print("Calculations complete. Script executed safely.")\nsolve()`
          : `console.log("Executing sandbox javascript module...");\nconsole.log("Resource safety borders checks passed.");`;
        setActiveLogStream(prev => prev + `[SIMULATOR] Successfully generated execution script:\n--------------------\n${mockCode}\n--------------------\n`);
      } else if (step === 5) {
        setActiveLogStream(prev => prev + `[SIMULATOR] Instantiating isolated container sandbox (RAM: 64MB, NET: BLOCKED)...\n`);
      } else if (step === 6) {
        setActiveLogStream(prev => prev + `[STDERR] Container logs successfully mapped to WebSocket output feed.\n`);
      } else if (step === 7) {
        setActiveLogStream(prev => prev + `\n[SIMULATOR] Halted execution. Exit Code: 0\n[SYSTEM] Sandboxed containers cleanly pruned.\n`);
      } else {
        clearInterval(interval);
        setIsRunning(false);
        
        const newMockExec: Execution = {
          id: `sim-exec-${Date.now()}`,
          agent_id: selectedAgentId,
          language,
          code: language === 'python' ? 'print("Simulated run success")' : 'console.log("Simulated run success")',
          status: 'success',
          logs: activeLogStream,
          created_at: new Date().toISOString()
        };
        setExecutions(prev => [newMockExec, ...prev]);
        setSelectedExecution(newMockExec);
      }
    }, 1000);
  };

  const selectedAgent = agents.find(a => a.id === selectedAgentId);

  return (
    <div className="app-container">
      
      {/* Top Header */}
      <header className="dashboard-header">
        <div className="header-brand">
          <div className="header-icon-wrapper">
            <Cpu size={26} />
          </div>
          <div className="header-title-group">
            <h1>AI Agent Sandbox Console</h1>
            <p>Runs untrusted, LLM-generated code blocks securely inside sandboxed Docker envelopes.</p>
          </div>
        </div>

        <div className="header-status-group">
          <div className={backendStatus === 'online' ? 'status-online' : 'status-offline'}>
            <span className="pulse-indicator"></span>
            <span>ENGINE: {backendStatus === 'online' ? 'ONLINE' : 'OFFLINE'}</span>
          </div>

          <button 
            id="btn-simulator-toggle"
            onClick={() => setSimulationMode(!simulationMode)}
            className={`btn-pill ${simulationMode ? 'active' : ''}`}
          >
            {simulationMode ? 'SIMULATOR: ACTIVE' : 'MOCK OFFLINE'}
          </button>
        </div>
      </header>

      {/* Main Grid Panels */}
      <div className="dashboard-grid">
        
        {/* Left Column: Agent Registry */}
        <section className="glass-panel">
          <div className="panel-header">
            <div className="panel-title">
              <Layers size={16} className="text-[#00f2fe]" />
              <span>Agent Registry</span>
            </div>
            <button 
              id="btn-show-agent-form"
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="btn-action-small"
              title="Create new agent"
            >
              <Plus size={14} />
            </button>
          </div>

          {/* Form Create overlay */}
          {showCreateForm && (
            <form onSubmit={handleCreateAgent} className="create-agent-overlay">
              <h3 className="create-agent-title">New Agent Profile</h3>
              <div className="form-group">
                <label className="form-label">Agent Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Code Optimizer" 
                  value={newAgentName}
                  onChange={(e) => setNewAgentName(e.target.value)}
                  className="form-select"
                  style={{ width: '100%' }}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">System Instruction</label>
                <textarea 
                  placeholder="e.g. You compile Javascript algorithms..." 
                  value={newAgentInstruction}
                  onChange={(e) => setNewAgentInstruction(e.target.value)}
                  className="form-textarea"
                  style={{ width: '100%', minHeight: '60px' }}
                  required
                />
              </div>
              <div className="btn-row">
                <button type="button" onClick={() => setShowCreateForm(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-action-submit">Save Profile</button>
              </div>
            </form>
          )}

          {/* Registry Container List */}
          <div className="registry-container">
            {agents.map((agent) => (
              <div 
                key={agent.id}
                onClick={() => {
                  setSelectedAgentId(agent.id);
                  setSelectedExecution(null);
                }}
                className={`agent-item ${selectedAgentId === agent.id ? 'selected' : ''}`}
              >
                <div className="agent-item-title">
                  <span>{agent.name}</span>
                  {selectedAgentId === agent.id && <ChevronRight size={12} style={{ color: 'var(--primary)' }} />}
                </div>
                <p className="agent-item-desc">
                  {agent.system_instruction}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Center Column: Pipeline Setup & Trigger */}
        <section className="glass-panel" style={{ justifyContent: 'space-between' }}>
          <div>
            <div className="panel-header">
              <div className="panel-title">
                <Activity size={16} style={{ color: 'var(--primary)' }} />
                <span>Orchestrator Pipeline</span>
              </div>
            </div>

            {/* Persona Display */}
            {selectedAgent && (
              <div className="agent-persona-box">
                <div className="agent-persona-header">
                  <Info size={12} />
                  <span>Active Agent Prompt Persona</span>
                </div>
                <p className="agent-persona-desc">
                  "{selectedAgent.system_instruction}"
                </p>
              </div>
            )}

            {/* Prompt Form */}
            <div className="form-group">
              <label className="form-label">Execution Goal (Task Prompt)</label>
              <textarea 
                value={taskInput}
                onChange={(e) => setTaskInput(e.target.value)}
                className="form-textarea"
                placeholder="Instruct the agent on what script it should write and run..."
                style={{ width: '100%', minHeight: '120px' }}
              />
            </div>

            {/* Config Selectors Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div className="form-group">
                <label className="form-label">Execution Runtime</label>
                <select 
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="form-select"
                  style={{ width: '100%' }}
                >
                  <option value="python">Python 3.10 (Slim)</option>
                  <option value="javascript">NodeJS 18 (Alpine)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Sandbox Constraints</label>
                <div style={{
                  background: 'rgba(239, 68, 68, 0.05)',
                  border: '1px solid rgba(239, 68, 68, 0.15)',
                  color: '#f87171',
                  padding: '0.65rem',
                  borderRadius: '10px',
                  fontSize: '0.7rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  fontWeight: 600
                }}>
                  <span>🔒 ISOLATED SANDBOX</span>
                  <span style={{ fontSize: '0.6rem', color: '#fca5a5', fontWeight: 'normal' }}>
                    Network Blocked / 64MB RAM Limit
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div>
            {/* Run Button CTA */}
            <button 
              id="btn-run-sandbox"
              disabled={isRunning || !selectedAgentId}
              onClick={handleLaunchExecution}
              className="btn-primary"
            >
              {isRunning ? (
                <>
                  <RefreshCw className="animate-spin" size={16} />
                  <span>Enqueued to Broker...</span>
                </>
              ) : (
                <>
                  <Play size={16} fill="currentColor" />
                  <span>Launch Ephemeral Sandbox</span>
                </>
              )}
            </button>

            {/* Pipeline Step Visualizer */}
            <div className="pipeline-visual">
              <div className="pipeline-nodes-wrapper">
                <div className="pipeline-line-connector"></div>
                <div className={`pipeline-node ${isRunning ? 'active' : 'completed'}`}>
                  <div className="pipeline-node-circle">1</div>
                  <span className="pipeline-node-label">Queue</span>
                </div>
                <div className={`pipeline-node ${isRunning ? 'active' : ''}`}>
                  <div className="pipeline-node-circle">2</div>
                  <span className="pipeline-node-label">AI Code</span>
                </div>
                <div className={`pipeline-node ${isRunning ? 'active' : ''}`}>
                  <div className="pipeline-node-circle">3</div>
                  <span className="pipeline-node-label">Docker</span>
                </div>
                <div className={`pipeline-node ${!isRunning && executions.length > 0 ? 'completed' : ''}`}>
                  <div className="pipeline-node-circle">4</div>
                  <span className="pipeline-node-label">SQL Logs</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Right Column: Live Logs Terminal & History */}
        <section className="glass-panel" style={{ gap: '1.25rem' }}>
          
          {/* Terminal Console */}
          <div className="terminal-console">
            <div className="terminal-topbar">
              <div className="terminal-dots">
                <span className="dot-r"></span>
                <span className="dot-y"></span>
                <span className="dot-g"></span>
              </div>
              <div className="terminal-title">
                sandbox_console_stream 
                {isRunning && currentExecutionId && ` (${currentExecutionId.substring(0, 8)})`}
              </div>
              {websocketActive && (
                <span style={{ fontSize: '0.6rem', color: 'var(--primary)', fontWeight: 'bold' }}>● LIVE</span>
              )}
            </div>
            
            <div className="terminal-output">
              <pre>{activeLogStream || selectedExecution?.logs || '[STANDBY] Ready for execution inputs. Enqueue a job above or select a historical execution archive item below...'}</pre>
              <div ref={terminalEndRef} />
            </div>
          </div>

          {/* History Archives */}
          <div>
            <div className="panel-title" style={{ marginBottom: '0.75rem' }}>
              <History size={16} />
              <span>Execution Archive</span>
            </div>

            <div className="history-container">
              {executions.length === 0 ? (
                <div style={{ color: 'hsl(var(--text-dark))', fontSize: '0.75rem', textAlign: 'center', padding: '1.5rem' }}>
                  No archived logs found.
                </div>
              ) : (
                executions.map((exec) => (
                  <div 
                    key={exec.id}
                    onClick={() => {
                      setSelectedExecution(exec);
                      setActiveLogStream(''); // clear active stream view for history
                    }}
                    className={`history-item ${selectedExecution?.id === exec.id ? 'selected' : ''}`}
                  >
                    <div className="history-meta">
                      <span className="history-id">RUN: {exec.id.substring(0, 8)}</span>
                      <span className="history-time">
                        {new Date(exec.created_at).toLocaleTimeString()} - {exec.language.toUpperCase()}
                      </span>
                    </div>
                    <span className={`badge-status ${exec.status.toLowerCase()}`}>
                      {exec.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

      </div>

    </div>
  );
}
