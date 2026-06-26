# AI Agent Sandbox Engine 🤖📦 (Isolated Container Execution Orchestrator)

A high-performance, event-driven orchestrator that compiles natural language goals into executable scripts (Python/JavaScript) using the Gemini API, queues executions, and streams real-time console outputs from isolated Docker containers.

Designed as an advanced **SDE Showcase project**, this system demonstrates production-grade system engineering concepts: container isolation, message brokers, real-time networking, and database fallbacks.

---

## 🏗️ Architecture Design

```
             ┌────────────────────────────────────────────────────────┐
             │                  React Frontend Dashboard              │
             └───────────────────▲─────────────────┬──────────────────┘
                 WebSockets      │                 │ HTTP Post (Run Job)
                 (Real-time Logs)│                 ▼
             ┌───────────────────┴─────────────────┴──────────────────┐
             │                    Node.js Backend Orchestrator        │
             └───────────────────▲─────────────────┬──────────────────┘
                                 │                 │
                Read history /   │                 │ Enqueue Task
                Persist logs     │                 ▼
             ┌───────────────────┴────────┐    ┌──────────────────────┐
             │       PostgreSQL DB        │    │    RabbitMQ Broker   │
             │   (pgvector memory fallback)│    │ (amqp task dispatcher)│
             └────────────────────────────┘    └──────────┬───────────┘
                                                          │
                                                          │ Consume Task
                                                          ▼
                                               ┌──────────────────────┐
                                               │    Worker Execution  │
                                               │  ┌─────────────────┐ │
                                               │  │ Ephemeral Docker│ │
                                               │  │ Python Sandbox  │ │
                                               │  └─────────────────┘ │
                                               └──────────────────────┘
```

1. **REST & WebSocket API**: Coordinates task runs, registers agents, and upgrades HTTP client requests into full duplex WebSockets for live streaming.
2. **RabbitMQ Task Dispatcher**: Decouples the REST request ingestion from heavy Docker compile/run tasks. If the broker is offline, the backend seamlessly falls back to an in-memory `process.nextTick` asynchronous scheduling ring.
3. **Docker Sandbox Execution**: Spins up ephemeral, resource-constrained containers (`python:3.10-slim` or `node:18-alpine`). 
   - **Network Blocked**: Runs with network interfaces disabled to prevent untrusted agent scripts from calling home or pulling malicious packages.
   - **Hard Boundaries**: CPU execution is limited to `0.5` cores and RAM to `64MB` to mitigate denial of service (DoS) attempts.
4. **PostgreSQL/SQLite Log Storage**: Execution logs, script code, and status codes are indexed in SQL databases. If SQL databases are unavailable, the backend invokes a transient memory repository automatically.
5. **Interactive Frontend Dashboard**: Built using React, Vite, and TypeScript. Displays a simulated visual node graph representing the pipeline and hosts a custom, high-frequency updating retro terminal logs console.

---

## 🛠️ Technology Stack

- **Backend**: NodeJS 18 (Express, Dockerode Client, AMQP Client, PG client, WS client, dotenv)
- **Frontend**: React 18, Vite 5, TypeScript, Lucide Icons, Custom Glassmorphic CSS variables
- **Infrastructure**: Ephemeral Docker Engine, RabbitMQ Broker (AMQP), PostgreSQL (pgvector enabled)

---

## ⚡ Setup & Run Instructions

Ensure you have **Docker Desktop** running and **NodeJS** installed.

### Step 1: Spin up Infrastructure Containers
From the root folder of the project, run:
```bash
docker-compose up -d
```
This boots PostgreSQL, RabbitMQ, and Redis instances.

### Step 2: Initialize & Run Backend
Navigate to the `backend` folder, copy variables, and start the service:
```bash
cd backend
# Edit .env and supply GEMINI_API_KEY for real AI compilation (optional, mock fallback is active)
npm start
```

### Step 3: Initialize & Run Frontend
Navigate to the `frontend` folder and start the Vite dev server:
```bash
cd ../frontend
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🧠 SDE Implementation Masterclass Highlights

- **Dynamic Demuxing**: Uses Docker container stream headers to demultiplex raw container socket logs into standard output and stderr streams.
- **Failover Fallbacks**: The code utilizes defensive programming. If Docker compose infrastructure (Postgres or RabbitMQ) is down, the backend downgrades to an in-memory queue and in-memory mock storage without crashing, ensuring the portfolio is always interactive.
- **Mock AI Compiler**: If no Gemini API Key is provided, a semantic prompt parser generates custom scripts dynamically to ensure execution tests run natively in simulated offline setups.
