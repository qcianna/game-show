import fastify from 'fastify';
import { setupWebSocket } from './websocket';
import type { Player, Room, ClientMsg, ServerMsg } from './types';
import { roomToJson } from './types';

const app = fastify();
const rooms = new Map<string, Room>();

function generateRoomCode(length = 6) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < length; i++) {
    const idx = Math.floor(Math.random() * alphabet.length);
    code += alphabet[idx];
  }
  return code;
}

function createRoom(code?: string): Room {
  let roomCode: string;
  if (code) {
    if (rooms.has(code)) {
      throw new Error("Room code already exists");
    }
    roomCode = code;
  } else {
    roomCode = generateRoomCode();
    while (rooms.has(roomCode)) roomCode = generateRoomCode();
  }

  const room: Room = {
    code: roomCode,
    createdAt: new Date().toISOString(),
    players: new Map(),
    buzzEnabled: false,
    buzzList: []
  };

  rooms.set(roomCode, room);
  return room;
}

app.get<{
  Params: { code: string };
}>("/rooms/:code", async (request, reply) => {
  const { code } = request.params;

  const room = rooms.get(code);
  if (!room) {
    reply.code(404);
    return { error: "ROOM_NOT_FOUND" as const };
  }

  return roomToJson(room);
});

app.get("/rooms", async () => {
  const list = Array.from(rooms.values()).map(room => roomToJson(room));
  return { status: "ok", rooms: list };
});

app.post<{
  Body: { id?: string };
}>("/rooms", async (request, reply) => {
  const { id } = request.body || {};
  try {
    const room = createRoom(id);
    reply.code(201);
    return { roomCode: room.code };
  } catch (err) {
    reply.code(400);
    return { error: "ROOM_CODE_EXISTS" };
  }
});

app.delete<{
  Params: { code: string };
}>("/rooms/:code", async (request, reply) => {
  const { code } = request.params;

  if (!rooms.has(code)) {
    reply.code(404);
    return { error: "ROOM_NOT_FOUND" };
  }

  rooms.delete(code);
  reply.code(204);  // No Content
});

app.delete("/rooms", async (request, reply) => {
  rooms.clear();
  reply.code(204);  // No Content
});

const start = async () => {
  try {
    let host = '0.0.0.0';
    let port = 3000;
    const args = process.argv.slice(2);
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--host' && args[i + 1]) {
        host = args[i + 1];
        i++;
      } else if (args[i] === '--port' && args[i + 1]) {
        port = parseInt(args[i + 1], 10);
        i++;
      }
    }

    await app.listen({ port, host });
    console.log(`Server is running on http://${host}:${port}`);
    setupWebSocket(app.server, rooms);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();