import { WebSocketServer } from 'ws';

// Map of executionId -> Set of WebSocket clients
const clientsMap = new Map();

export function initializeWebSocketServer(httpServer) {
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url, `http://${request.headers.host}`);
    const pathname = url.pathname;

    if (pathname.startsWith('/ws/logs/')) {
      const executionId = pathname.split('/').pop();
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, executionId);
      });
    } else {
      socket.destroy();
    }
  });

  wss.on('connection', (ws, executionId) => {
    if (!clientsMap.has(executionId)) {
      clientsMap.set(executionId, new Set());
    }
    
    clientsMap.get(executionId).add(ws);
    ws.send(JSON.stringify({ event: 'system', data: '[WEBSOCKET] Stream connection established.\n' }));

    ws.on('close', () => {
      const activeClients = clientsMap.get(executionId);
      if (activeClients) {
        activeClients.delete(ws);
        if (activeClients.size === 0) {
          clientsMap.delete(executionId);
        }
      }
    });
  });
}

// Broadcasts real-time logs to all subscribers watching a specific executionId
export function broadcastLog(executionId, logText) {
  const activeClients = clientsMap.get(executionId);
  if (activeClients) {
    const payload = JSON.stringify({ event: 'log', data: logText });
    for (const ws of activeClients) {
      if (ws.readyState === ws.OPEN) {
        ws.send(payload);
      }
    }
  }
}
