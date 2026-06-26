import pg from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { config } from './config.js';

const { Pool } = pg;

let pool = null;
let useFallback = false;

// Robust in-memory fallback store for zero-dependency local starts
const fallbackDb = {
  agents: [
    {
      id: 'd9b23b12-9c1a-4d7a-8f7c-7d92305a4123',
      name: 'Standard Python Math Agent',
      system_instruction: 'You write python scripts to solve math tasks.',
      created_at: new Date()
    }
  ],
  executions: [],
  memories: []
};

export async function connectDatabase() {
  try {
    pool = new Pool({
      connectionString: config.databaseUrl,
      connectionTimeoutMillis: 5000,
    });
    
    // Quick probe
    await pool.query('SELECT NOW()');
    console.log('[DATABASE] PostgreSQL database connection successful.');

    // Initialize pgvector and extensions
    await pool.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);
    try {
      await pool.query(`CREATE EXTENSION IF NOT EXISTS "vector";`);
    } catch (e) {
      console.warn('[DATABASE WARNING] pgvector extension not supported on host Postgres. Semantic memories will fallback to lexical matches.');
    }

    // Provision Tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS agents (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(255) NOT NULL,
        system_instruction TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS executions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
        language VARCHAR(50) NOT NULL,
        code TEXT NOT NULL,
        status VARCHAR(50) NOT NULL,
        logs TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS memories (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        embedding VECTOR(1536),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

  } catch (err) {
    console.warn(`[DATABASE WARNING] Could not connect to PostgreSQL: ${err.message}. Falling back to in-memory store.`);
    useFallback = true;
  }
}

export async function saveAgent(name, systemInstruction) {
  if (useFallback) {
    const agent = {
      id: uuidv4(),
      name,
      system_instruction: systemInstruction,
      created_at: new Date()
    };
    fallbackDb.agents.push(agent);
    return agent;
  }
  const result = await pool.query(
    `INSERT INTO agents (name, system_instruction) VALUES ($1, $2) RETURNING *;`,
    [name, systemInstruction]
  );
  return result.rows[0];
}

export async function saveExecution(agentId, language, code, status, logs) {
  if (useFallback) {
    const execution = {
      id: uuidv4(),
      agent_id: agentId,
      language,
      code,
      status,
      logs,
      created_at: new Date()
    };
    fallbackDb.executions.push(execution);
    return execution;
  }
  const result = await pool.query(
    `INSERT INTO executions (agent_id, language, code, status, logs) VALUES ($1, $2, $3, $4, $5) RETURNING *;`,
    [agentId, language, code, status, logs]
  );
  return result.rows[0];
}

export async function getExecutions() {
  if (useFallback) {
    return fallbackDb.executions.sort((a, b) => b.created_at - a.created_at);
  }
  const result = await pool.query('SELECT * FROM executions ORDER BY created_at DESC LIMIT 50;');
  return result.rows;
}

export async function getAgents() {
  if (useFallback) {
    return fallbackDb.agents;
  }
  const result = await pool.query('SELECT * FROM agents ORDER BY created_at DESC;');
  return result.rows;
}
