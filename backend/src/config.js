import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: process.env.PORT || 5000,
  databaseUrl: process.env.DATABASE_URL || 'postgres://sandbox_user:sandbox_password@localhost:5432/agent_sandbox',
  rabbitmqUrl: process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  geminiApiKey: process.env.GEMINI_API_KEY || ''
};
