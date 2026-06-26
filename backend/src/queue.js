import amqp from 'amqplib';
import { EventEmitter } from 'events';
import { config } from './config.js';

export const queueEvents = new EventEmitter();

let channel = null;
let useFallback = false;

export async function connectQueue() {
  try {
    const connection = await amqp.connect(config.rabbitmqUrl);
    channel = await connection.createChannel();
    await channel.assertQueue('agent_tasks', { durable: true });
    
    console.log('[QUEUE] RabbitMQ connection successful.');

    // Consume queue messages
    channel.consume('agent_tasks', (msg) => {
      if (msg !== null) {
        try {
          const taskData = JSON.parse(msg.content.toString());
          queueEvents.emit('task', taskData);
        } catch (e) {
          console.error('[QUEUE ERROR] Failed to parse message content:', e.message);
        } finally {
          channel.ack(msg);
        }
      }
    });
  } catch (err) {
    console.warn(`[QUEUE WARNING] Could not connect to RabbitMQ: ${err.message}. Falling back to in-memory process.nextTick scheduler.`);
    useFallback = true;
  }
}

// Publishes agent task definitions to RabbitMQ or directly triggers process queue fallback
export async function publishTask(executionId, agentId, taskInput, language) {
  const payload = { executionId, agentId, taskInput, language };

  if (useFallback) {
    process.nextTick(() => {
      queueEvents.emit('task', payload);
    });
    return;
  }

  try {
    channel.sendToQueue('agent_tasks', Buffer.from(JSON.stringify(payload)), {
      persistent: true,
    });
  } catch (err) {
    console.error('[QUEUE ERROR] Failed to publish task. Retrying with in-memory execution:', err.message);
    process.nextTick(() => {
      queueEvents.emit('task', payload);
    });
  }
}
