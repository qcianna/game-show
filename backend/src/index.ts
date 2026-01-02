import fastify from 'fastify';
import { setupWebSocket } from './websocket';
import type { Player, Room, ClientMsg, ServerMsg } from './types';

const app = fastify();
const rooms = new Map();

function generateRoomCode(length = 6) {
  // bez O/0 i I/1 żeby nie mylić
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < length; i++) {
    const idx = Math.floor(Math.random() * alphabet.length);
    code += alphabet[idx];
  }
  return code;
}

function createRoom(): Room {
  let roomCode = generateRoomCode();
  while (rooms.has(roomCode)) roomCode = generateRoomCode();

  const room: Room = {
    code: roomCode,
    createdAt: new Date().toISOString(),
    players: new Map()
  };

  rooms.set(roomCode, room);
  return room;
}

function roomToJson(room: Room) {
  return {
    roomCode: room.code,
    createdAt: room.createdAt,
    players: Array.from(room.players.values())
  };
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

app.post("/rooms", async (_request, reply) => {
  const room = createRoom();
  reply.code(201);
  return { roomCode: room.code };
});
 

// app.get("/rooms/:code", async (request, reply) => {
//   const { code } = request.params;

//   const room = rooms.get(code);
//   if (!room) {
//     reply.code(404);
//     return { error: "ROOM_NOT_FOUND" };
//   }

//   return roomToJson(room);
// });



const start = async () => {
  try {
    await app.listen({ port: 3000 });
    console.log('Server is running on http://localhost:3000');
    setupWebSocket(app.server, rooms);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();