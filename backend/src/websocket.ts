import { WebSocketServer, WebSocket } from "ws";
import { IncomingMessage } from 'http';
import type { Player, Room, ClientMsg, ServerMsg } from './types';
import { roomToJson } from './types';  // Dodaj ten import

export function setupWebSocket(server: any, rooms: Map<string, Room>) {
  const wss = new WebSocketServer({ server, path: "/ws" });
  const clients = new Map<WebSocket, { roomCode?: string; playerId?: string }>();

  wss.on('connection', (ws: WebSocket, request: IncomingMessage) => {
    console.log('New WebSocket connection');
    console.log(`Connection from: ${request.url}`);

    ws.on('message', (message: Buffer) => {
      console.log(`Received message: ${message.toString()}`);
      try {
        const msg: ClientMsg = JSON.parse(message.toString());
        handleMessage(ws, msg, rooms, clients);
      } catch (err) {
        console.log(`Error parsing message: ${err}`);
        ws.send(JSON.stringify({ type: "ERROR", code: "INVALID_MESSAGE", message: "Invalid JSON" }));
      }
    });

    ws.on('close', () => {
      const clientInfo = clients.get(ws);
      console.log(`Client disconnected from room ${clientInfo?.roomCode}`);
      if (clientInfo?.roomCode && clientInfo?.playerId) {
        const room = rooms.get(clientInfo.roomCode);
        if (room) {
          room.players.delete(clientInfo.playerId);
          broadcastToRoom(room, { status: "STATE", roomCode: room.code, details: room });
        }
      }
      clients.delete(ws);
    });
  });

  function handleMessage(ws: WebSocket, msg: ClientMsg, rooms: Map<string, Room>, clients: Map<WebSocket, any>) {
    console.log(`Handling message type: ${msg.type}`);
    const buzzRoom = rooms.get(msg.roomCode);
    switch (msg.type) {
      case "JOIN":
        console.log(`Player ${msg.playerName} joined room ${msg.roomCode}`);
        const room = rooms.get(msg.roomCode);
        if (!room) {
          ws.send(JSON.stringify({ type: "ERROR", code: "ROOM_NOT_FOUND", message: "Room not found" }));
          return;
        }
        const playerId = msg.playerId;
        const player: Player = { id: playerId, name: msg.playerName };
        room.players.set(playerId, player);
        if (room.players.size === 1) {
          room.adminId = playerId;
        }
        clients.set(ws, { roomCode: msg.roomCode, playerId });
        // Użyj roomToJson zamiast inline
        broadcastToRoom(room, { status: "STATE", roomCode: room.code, details: roomToJson(room) });
        break;
      case "RESET_BUZZ":
        console.log(`Buzz reset in room ${msg.roomCode} by ${msg.playerId}`);
        if (!buzzRoom) {
          ws.send(JSON.stringify({ type: "ERROR", code: "ROOM_NOT_FOUND", message: "Room not found" }));
          return;
        }
        if (msg.playerId !== buzzRoom.adminId) {
          ws.send(JSON.stringify({ type: "ERROR", code: "UNAUTHORIZED", message: "Only admin can enable buzz mode" }));
          return;
        }
        buzzRoom.buzzEnabled = false;
        buzzRoom.buzzList = [];
        broadcastToRoom(buzzRoom, { status: "BUZZ_RESET", roomCode: buzzRoom.code, details: roomToJson(buzzRoom) });
        break;
      case "ENABLE_BUZZ":
        console.log(`Buzz enabled in room ${msg.roomCode} by ${msg.playerId}`);
        if (!buzzRoom) {
          ws.send(JSON.stringify({ type: "ERROR", code: "ROOM_NOT_FOUND", message: "Room not found" }));
          return;
        }
        if (msg.playerId !== buzzRoom.adminId) {
          ws.send(JSON.stringify({ type: "ERROR", code: "UNAUTHORIZED", message: "Only admin can enable buzz mode" }));
          return;
        }
        buzzRoom.buzzEnabled = true;
        buzzRoom.buzzList = [];
        broadcastToRoom(buzzRoom, { status: "BUZZ_ENABLED", roomCode: buzzRoom.code, details: roomToJson(buzzRoom) });
        break;
      case "BUZZ":
        console.log(`Player ${msg.playerId} buzzed in room ${msg.roomCode}`);
        const buzzRoom2 = rooms.get(msg.roomCode);
        if (!buzzRoom2) {
          ws.send(JSON.stringify({ status: "ERROR", code: "ROOM_NOT_FOUND", message: "Room not found" }));
          return;
        }
        if (!buzzRoom2.buzzEnabled) {
          ws.send(JSON.stringify({ status: "ERROR", code: "BUZZ_NOT_ENABLED", message: "Buzz mode is not enabled" }));
          return;
        }
        if (buzzRoom2.buzzList.some(b => b.playerId === msg.playerId)) {
          ws.send(JSON.stringify({ status: "ERROR", code: "ALREADY_BUZZED", message: "You have already buzzed" }));
          return;
        }
        buzzRoom2.buzzList.push({ playerId: msg.playerId, timestamp: Date.now() });
        const buzzUpdate = buzzRoom2.buzzList.map(b => ({
          playerId: b.playerId,
          name: buzzRoom2.players.get(b.playerId)?.name || "Unknown",
          timestamp: b.timestamp
        }));
        broadcastToRoom(buzzRoom2, { status: "BUZZ_UPDATE", roomCode: buzzRoom2.code, details: roomToJson(buzzRoom2) });
        break;
    }
  }

  function broadcastToRoom(room: Room, msg: ServerMsg) {
    console.log(`Broadcasting to room ${room.code}:`, JSON.stringify(msg, null, 2));
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