import { io } from 'socket.io-client';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:4000';

let socket;

export function getSocket() {
  if (!socket) {
    socket = io(SERVER_URL);
  }
  return socket;
}
