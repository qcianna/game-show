import { WebSocketServer, WebSocket } from "ws";
import { IncomingMessage } from 'http';
import type { Player, Room, ClientMsg, ServerMsg } from './types';

export function setupWebSocket(server: any, rooms: Map<string, Room>) {
  const wss = new WebSocketServer({ server, path: "/ws" });
  const clients = new Map<WebSocket, { roomCode?: string; playerId?: string }>();

  wss.on('connection', (ws: WebSocket, request: IncomingMessage) => {
    console.log('New WebSocket connection');

    ws.on('message', (message: Buffer) => {
      try {
        const msg: ClientMsg = JSON.parse(message.toString());
        handleMessage(ws, msg, rooms, clients);
      } catch (err) {
        ws.send(JSON.stringify({ type: "ERROR", code: "INVALID_MESSAGE", message: "Invalid JSON" }));
      }
    });

    ws.on('close', () => {
      const clientInfo = clients.get(ws);
      if (clientInfo?.roomCode && clientInfo?.playerId) {
        const room = rooms.get(clientInfo.roomCode);
        if (room) {
          room.players.delete(clientInfo.playerId);
          broadcastToRoom(room, { type: "STATE", roomCode: room.code, players: Array.from(room.players.values()), online: getOnlinePlayers(room, clients) });
        }
      }
      clients.delete(ws);
    });
  });

  function handleMessage(ws: WebSocket, msg: ClientMsg, rooms: Map<string, Room>, clients: Map<WebSocket, any>) {
    switch (msg.type) {
      case "JOIN":
        const room = rooms.get(msg.roomCode);
        if (!room) {
          ws.send(JSON.stringify({ type: "ERROR", code: "ROOM_NOT_FOUND", message: "Room not found" }));
          return;
        }
        const playerId = Math.random().toString(36).substr(2, 9);
        const player: Player = { id: playerId, name: msg.name };
        room.players.set(playerId, player);
        clients.set(ws, { roomCode: msg.roomCode, playerId });
        broadcastToRoom(room, { type: "STATE", roomCode: room.code, players: Array.from(room.players.values()), online: getOnlinePlayers(room, clients) });
        break;
      case "RESET":
        // Implement reset logic if needed
        break;
      case "BUZZ":
        // Implement buzz logic
        break;
    }
  }

  function broadcastToRoom(room: Room, msg: ServerMsg) {
    wss.clients.forEach(client => {
      const clientInfo = clients.get(client);
      if (clientInfo?.roomCode === room.code && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(msg));
      }
    });
  }

  function getOnlinePlayers(room: Room, clients: Map<WebSocket, any>): { id: string; name: string }[] {
    const online: { id: string; name: string }[] = [];
    wss.clients.forEach(client => {
      const clientInfo = clients.get(client);
      if (clientInfo?.roomCode === room.code && client.readyState === WebSocket.OPEN) {
        const player = room.players.get(clientInfo.playerId);
        if (player) online.push({ id: player.id, name: player.name });
      }
    });
    return online;
  }
}