import { WebSocketServer, WebSocket } from "ws";
import { Server } from "http";

let wss: WebSocketServer;

export function initWs(server: Server) {
  wss = new WebSocketServer({ server });

  wss.on("connection", (ws) => {
    console.log("WS: Client connected");
    
    ws.on("message", (data) => {
      try {
        const message = JSON.parse(data.toString());
        // Handle incoming messages if needed
        console.log("WS: Received", message);
      } catch (e) {
        console.error("WS: Failed to parse message", e);
      }
    });

    ws.on("close", () => {
      console.log("WS: Client disconnected");
    });
  });
}

export function broadcast(type: string, payload: any) {
  if (!wss) return;
  
  const message = JSON.stringify({ type, payload });
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}
