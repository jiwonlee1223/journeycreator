// utils/socket.ts
import { io, Socket } from "socket.io-client";

const socket: Socket = io(undefined, {
  path: "/api/socket",
});

export default socket;
