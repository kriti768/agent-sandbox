import React, { useState, useEffect, useRef } from 'react';
import { 
  Terminal as TerminalIcon, 
  Cpu, 
  Play, 
  Layers, 
  Plus, 
  RefreshCw, 
  FileCode, 
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
  const [currentExecutionId, setCurrentExecutionId] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [backendStatus, setBackendStatus] = useState<'online' | 'offline'>('online');
  const [websocketActive, setWebsocketActive] = useState<boolean>(false);
  
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
      console.warn('Backend is currently offline or unreachable. Using mock data mode.');
      setBackendStatus('offline');
      
      // Load fallback mock agents
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
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

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

    // Frontend simulation fallback
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

      // Establish WebSocket stream for logs
      connectWebsocket(executionId);

    } catch (err: any) {
      setActiveLogStream(prev => prev + `[ERROR] Boot sequence failed: ${err.message}\n[SYSTEM] Reverting to simulated environment...\n`);
      simulateLocalExecution(selectedAgentObj?.system_instruction || '');
    }
  };

  // Connect WebSocket log stream listener
  const connectWebsocket = (executionId: string) => {
    if (wsRef.current) wsRef.current.close();

    const socketUrl = `${WS_BASE}/logs/${executionId}`;
    const ws = new WebSocket(socketUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setWebsocketActive(true);
      setActiveLogStream(prev => prev + `[WEBSOCKET] Connected to orchestrator channel.\n`);
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.event === 'log' || payload.event === 'system') {
          setActiveLogStream(prev => prev + payload.data);
        }
      } catch (err) {
        // Appends raw string if JSON parsing fails
        setActiveLogStream(prev => prev + event.data);
      }
    };

    ws.onclose = () => {
      setWebsocketActive(false);
      setIsRunning(false);
      setActiveLogStream(prev => prev + `\n[SYSTEM] WebSocket stream closed by remote host.\n`);
      fetchData(); // Refresh history
    };

    ws.onerror = (err) => {
      console.error('WebSocket Error:', err);
      setActiveLogStream(prev => prev + `[ERROR] Log channel socket error.\n`);
    };
  };

  // Local simulated run for demonstration portability
  const simulateLocalExecution = (systemInstruction: string) => {
    let step = 0;
    const interval = setInterval(() => {
      step++;
      if (step === 1) {
        setActiveLogStream(prev => prev + `[SIMULATOR] Connecting mock agent socket...\n`);
      } else if (step === 2) {
        setActiveLogStream(prev => prev + `[SIMULATOR] Dispatching instruction: "${systemInstruction}"\n`);
      } else if (step === 3) {
        setActiveLogStream(prev => prev + `[SIMULATOR] Generating script payload via Gemini (Simulated)...\n`);
      } else if (step === 4) {
        const mockCode = language === 'python' 
          ? `def solve():\n    print("Executing simulated python algorithm for prompt...")\n    print("All tasks successfully run inside isolated Docker environment.")\nsolve()`
          : `console.log("Executing simulated javascript algorithm...")\nconsole.log("Isolated sandboxed container validated.");`;
        setActiveLogStream(prev => prev + `[SIMULATOR] Compiled execution code:\n--------------------\n${mockCode}\n--------------------\n`);
      } else if (step === 5) {
        setActiveLogStream(prev => prev + `[SIMULATOR] Creating isolated Docker instance: python:3.10-slim...\n[SIMULATOR] Bound constraints: 64MB RAM, Network BLOCK.\n`);
      } else if (step === 6) {
        setActiveLogStream(prev => prev + `[STDERR] [WARNING] Execution utilizes sandbox mock memory boundaries.\n`);
      } else if (step === 7) {
        setActiveLogStream(prev => prev + `\n[SIMULATOR] Execution finished. Return status: 0\n[SYSTEM] Sandbox resources safely cleaned.\n`);
      } else {
        clearInterval(interval);
        setIsRunning(false);
        
        // Add run to client history
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
    }, 1200);
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'success':
        return <span className="badge badge-green">Success</span>;
      case 'failed':
        return <span className="badge badge-red">Failed</span>;
      default:
        return <span className="badge badge-yellow">Pending</span>;
    }
  };

  const selectedAgent = agents.find(a => a.id === selectedAgentId);

  return (
    <div className="min-h-screen flex flex-col p-4 md:p-6" style={{ maxWidth: '1600px', margin: '0 auto' }}>
      
      {/* Top Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[hsl(var(--border-color))] mb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[rgba(0,242,254,0.1)] text-[#00f2fe]">
              <Cpu size={28} />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
              AI Agent Sandbox Console
            </h1>
          </div>
          <p className="text-[hsl(var(--text-muted))] text-sm mt-1">
            Securely compiles, queues, and runs LLM-generated code in isolated Docker environments.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto">
          {/* Backend Status indicator */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[rgba(15,23,42,0.4)] border border-[rgba(255,255,255,0.06)] text-xs">
            <Activity size={14} className={backendStatus === 'online' ? 'text-emerald-400' : 'text-rose-400'} />
            <span className="text-[hsl(var(--text-muted))]">Engine Status:</span>
            <span className={backendStatus === 'online' ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
              {backendStatus === 'online' ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>

          {/* Simulator Toggle */}
          <button 
            id="btn-simulator-toggle"
            onClick={() => setSimulationMode(!simulationMode)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              simulationMode 
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300' 
                : 'bg-slate-800/40 border-slate-700/60 text-[hsl(var(--text-muted))]'
            }`}
          >
            {simulationMode ? 'Simulated Mode: ACTIVE' : 'Simulate Engine Offline'}
          </button>
        </div>
      </header>

      {/* Main Grid Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
        
        {/* Left Column: Agent Registry */}
        <section className="lg:col-span-3 flex flex-col gap-4">
          <div className="glass-panel p-4 flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Layers size={18} className="text-[#00f2fe]" />
                <h2 className="font-semibold text-md" style={{ fontFamily: 'var(--font-display)' }}>Agent Registry</h2>
              </div>
              <button 
                id="btn-show-agent-form"
                onClick={() => setShowCreateForm(!showCreateForm)}
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-[#00f2fe] transition"
              >
                <Plus size={16} />
              </button>
            </div>

            {/* Create Agent form overlay/panel */}
            {showCreateForm && (
              <form onSubmit={handleCreateAgent} className="p-3 rounded-lg bg-slate-900/60 border border-[rgba(255,255,255,0.06)] mb-4 flex flex-col gap-3">
                <h3 className="text-xs font-bold text-[#00f2fe] tracking-wider uppercase">New Agent Profile</h3>
                <div>
                  <label className="text-[10px] uppercase text-[hsl(var(--text-muted))]">Agent Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Data Sorter" 
                    value={newAgentName}
                    onChange={(e) => setNewAgentName(e.target.value)}
                    className="w-full text-xs bg-[hsl(var(--bg-input))] border border-[hsl(var(--border-color))] rounded p-2 text-white outline-none focus:border-[#00f2fe]"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase text-[hsl(var(--text-muted))]">System Instruction (Prompt)</label>
                  <textarea 
                    placeholder="Provide guidelines on how the agent compiles python code..." 
                    value={newAgentInstruction}
                    onChange={(e) => setNewAgentInstruction(e.target.value)}
                    className="w-full text-xs bg-[hsl(var(--bg-input))] border border-[hsl(var(--border-color))] rounded p-2 text-white outline-none h-16 resize-none focus:border-[#00f2fe]"
                    required
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <button 
                    type="button" 
                    onClick={() => setShowCreateForm(false)} 
                    className="px-2 py-1 text-[10px] rounded bg-slate-800 hover:bg-slate-700 text-white"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="px-2 py-1 text-[10px] rounded bg-[#00f2fe] hover:bg-[#00f2fe]/80 text-black font-semibold"
                  >
                    Save Agent
                  </button>
                </div>
              </form>
            )}

            {/* List of Registry agents */}
            <div className="flex flex-col gap-2 overflow-y-auto max-h-[350px] lg:max-h-none flex-1 pr-1">
              {agents.map((agent) => (
                <div 
                  key={agent.id}
                  onClick={() => {
                    setSelectedAgentId(agent.id);
                    setSelectedExecution(null);
                  }}
                  className={`p-3 rounded-lg border text-left cursor-pointer transition ${
                    selectedAgentId === agent.id 
                      ? 'bg-[rgba(0,242,254,0.06)] border-[#00f2fe] text-white' 
                      : 'bg-slate-950/30 border-[rgba(255,255,255,0.05)] hover:border-slate-700 text-[hsl(var(--text-muted))]'
                  }`}
                >
                  <div className="font-semibold text-sm flex items-center justify-between">
                    <span className="truncate">{agent.name}</span>
                    {selectedAgentId === agent.id && <ChevronRight size={14} className="text-[#00f2fe]" />}
                  </div>
                  <p className="text-[10px] line-clamp-2 mt-1 opacity-70">
                    {agent.system_instruction}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Center Column: Pipeline Setup & Trigger */}
        <section className="lg:col-span-5 flex flex-col gap-6">
          <div className="glass-panel p-5 flex flex-col justify-between gap-6 flex-1">
            <div>
              <h2 className="font-semibold text-lg mb-4 flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
                <Activity size={18} className="text-[#00f2fe]" />
                Pipeline Orchestrator
              </h2>

              {/* Agent Settings Details */}
              {selectedAgent && (
                <div className="p-4 rounded-lg bg-slate-950/40 border border-[rgba(255,255,255,0.05)] mb-4">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#00f2fe] mb-1">
                    <Info size={14} />
                    <span>Active System Persona</span>
                  </div>
                  <p className="text-xs text-[hsl(var(--text-muted))] italic">
                    "{selectedAgent.system_instruction}"
                  </p>
                </div>
              )}

              {/* Task Goal Prompt */}
              <div className="mb-4">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[hsl(var(--text-muted))] mb-1.5">
                  Execution Goal (Prompt)
                </label>
                <textarea 
                  value={taskInput}
                  onChange={(e) => setTaskInput(e.target.value)}
                  className="w-full text-sm bg-[hsl(var(--bg-input))] border border-[hsl(var(--border-color))] rounded-lg p-3 text-white outline-none focus:border-[#00f2fe] h-24 resize-none transition"
                  placeholder="Describe what algorithm the agent must build and run..."
                />
              </div>

              {/* Stack Selector */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[hsl(var(--text-muted))] mb-1.5">
                    Execution Runtime
                  </label>
                  <select 
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full text-xs bg-[hsl(var(--bg-input))] border border-[hsl(var(--border-color))] rounded-lg p-2.5 text-white outline-none focus:border-[#00f2fe] cursor-pointer"
                  >
                    <option value="python">Python 3.10 (Slim)</option>
                    <option value="javascript">NodeJS 18 (Alpine)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[hsl(var(--text-muted))] mb-1.5">
                    Sandbox Security
                  </label>
                  <div className="w-full text-[10px] bg-red-950/15 border border-red-500/20 text-red-400 rounded-lg p-2 flex flex-col justify-center">
                    <span className="font-bold">🔒 RESOURCE ISOLATED</span>
                    <span>No Web Access / 64MB RAM Limit</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Run CTA Button */}
            <button 
              id="btn-run-sandbox"
              disabled={isRunning || !selectedAgentId}
              onClick={handleLaunchExecution}
              className={`w-full py-3.5 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${
                isRunning 
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-[#00f2fe] to-[#4f46e5] text-black hover:brightness-110 active:scale-[0.98]'
              }`}
            >
              {isRunning ? (
                <>
                  <RefreshCw className="animate-spin" size={18} />
                  <span>Broker Running Sandbox Job...</span>
                </>
              ) : (
                <>
                  <Play size={18} fill="currentColor" />
                  <span>Launch Agent Sandbox Sandbox</span>
                </>
              )}
            </button>
          </div>

          {/* Mini Execution Flow visualizer */}
          <div className="glass-panel p-4 flex flex-col gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--text-muted))]">Engine Execution pipeline</h3>
            <div className="flex items-center justify-between text-center pt-2 relative">
              <div className="absolute top-[35px] left-[15%] right-[15%] h-[1px] bg-slate-800 -z-10" />
              
              <div className="flex flex-col items-center gap-1.5 z-10">
                <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-xs">1</div>
                <span className="text-[10px] text-[hsl(var(--text-muted))]">Goal Queue</span>
              </div>
              <div className="flex flex-col items-center gap-1.5 z-10">
                <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-xs text-[#00f2fe]">2</div>
                <span className="text-[10px] text-[hsl(var(--text-muted))]">Gemini API</span>
              </div>
              <div className="flex flex-col items-center gap-1.5 z-10">
                <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-xs text-amber-400">3</div>
                <span className="text-[10px] text-[hsl(var(--text-muted))]">Docker Box</span>
              </div>
              <div className="flex flex-col items-center gap-1.5 z-10">
                <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-xs text-emerald-400">4</div>
                <span className="text-[10px] text-[hsl(var(--text-muted))]">Postgres</span>
              </div>
            </div>
          </div>
        </section>

        {/* Right Column: Live Logs Terminal & History */}
        <section className="lg:col-span-4 flex flex-col gap-4">
          
          {/* Terminal Panel */}
          <div className="glass-panel p-4 flex flex-col h-[320px] lg:h-[420px]">
            <div className="flex items-center justify-between mb-3 border-b border-[hsl(var(--border-color))] pb-2">
              <div className="flex items-center gap-2">
                <TerminalIcon size={16} className="text-[#00f2fe]" />
                <span className="text-xs font-semibold" style={{ fontFamily: 'var(--font-display)' }}>Real-Time System Log Terminal</span>
                {isRunning && currentExecutionId && (
                  <span className="text-[10px] text-slate-500 font-mono">({currentExecutionId.substring(0, 8)})</span>
                )}
              </div>
              {websocketActive && (
                <div className="flex items-center gap-1">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                  </span>
                  <span className="text-[9px] text-cyan-400 font-bold uppercase tracking-wider">LIVE STREAM</span>
                </div>
              )}
            </div>

            {/* Logs Area */}
            <div className="terminal-window flex-1 overflow-y-auto">
              <div className="terminal-header">
                <span className="dot red"></span>
                <span className="dot yellow"></span>
                <span className="dot green"></span>
                <span className="text-[10px] text-slate-500 ml-2">sandbox_runner_console</span>
              </div>
              <pre className="whitespace-pre-wrap select-text pr-2">
                {activeLogStream || selectedExecution?.logs || '[IDLE] Standing by. Enqueue a job above or select a past execution history entry below...'}
              </pre>
              <div ref={terminalEndRef} />
            </div>
          </div>

          {/* History Panel */}
          <div className="glass-panel p-4 flex flex-col flex-1 min-h-[220px]">
            <div className="flex items-center gap-2 mb-3">
              <History size={16} className="text-[#00f2fe]" />
              <h2 className="font-semibold text-xs uppercase tracking-wider text-[hsl(var(--text-muted))]" style={{ fontFamily: 'var(--font-display)' }}>
                Execution Archives (History)
              </h2>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[250px] lg:max-h-none flex flex-col gap-2">
              {executions.length === 0 ? (
                <div className="text-center text-xs text-[hsl(var(--text-dark))] py-6">
                  No records stored yet.
                </div>
              ) : (
                executions.map((exec) => (
                  <div 
                    key={exec.id}
                    onClick={() => {
                      setSelectedExecution(exec);
                      setActiveLogStream(''); // clear live stream to highlight historical views
                    }}
                    className={`p-3 rounded-lg border text-left cursor-pointer transition text-xs flex items-center justify-between ${
                      selectedExecution?.id === exec.id 
                        ? 'bg-slate-900 border-[#00f2fe] text-white' 
                        : 'bg-slate-950/20 border-[rgba(255,255,255,0.03)] hover:border-slate-800 text-[hsl(var(--text-muted))]'
                    }`}
                  >
                    <div className="flex flex-col gap-1 truncate pr-2">
                      <div className="flex items-center gap-2 font-medium">
                        <FileCode size={12} className="text-slate-400" />
                        <span className="truncate">{exec.id.substring(0, 8)}...</span>
                      </div>
                      <span className="text-[9px] text-[hsl(var(--text-dark))]">
                        {new Date(exec.created_at).toLocaleTimeString()} - {exec.language.toUpperCase()}
                      </span>
                    </div>
                    <div>{getStatusBadge(exec.status)}</div>
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
