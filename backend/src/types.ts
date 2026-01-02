export type Player = { id: string; name: string };
export type Room = {
  code: string;
  createdAt: string;
  players: Map<string, Player>;
};

export type ClientMsg =
  | { type: "JOIN"; roomCode: string; name: string }
  | { type: "RESET"; roomCode: string }
  | { type: "BUZZ"; roomCode: string };

export type ServerMsg =
  | {
      type: "STATE";
      roomCode: string;
      players: Player[];
      online: { id: string; name: string }[];
    }
  | { type: "ERROR"; code: string; message: string };