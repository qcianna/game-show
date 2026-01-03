export type Player = { id: string; name: string };
export interface Room {
  code: string;
  createdAt: string;
  players: Map<string, Player>;
  adminId?: string;
  buzzEnabled: boolean;
  buzzList: { playerId: string; timestamp: number }[];
}

export type ClientMsg =
  | { type: "JOIN"; roomCode: string; playerId: string, playerName: string }
  | { type: "RESET_BUZZ"; roomCode: string; playerId: string }
  | { type: "BUZZ"; roomCode: string;playerId: string }
  | { type: "ENABLE_BUZZ"; roomCode: string; playerId: string };

export type ServerMsg =
  | { status: "ERROR"; code: string; message: string }
  | { status: "STATE"; roomCode: string; details: Object}
  | { status: "BUZZ_ENABLED"; roomCode: string; details: Object}
  | { status: "BUZZ_RESET"; roomCode: string; details: Object}
  | { status: "BUZZ_UPDATE"; roomCode: string; details: Object};

export function roomToJson(room: Room) {
  return {
    ...room,
    players: Array.from(room.players.values())
  };
}