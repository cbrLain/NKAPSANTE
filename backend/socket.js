// socket.js — Gestion centralisée de Socket.IO
const { Server } = require('socket.io');

let io = null;

function initSocket(httpServer) {
  io = new Server(httpServer, { cors: { origin: '*' } });
  io.on('connection', (socket) => {
    socket.on('join', (room) => socket.join(room));
    socket.on('leave', (room) => socket.leave(room));
  });
  return io;
}

function broadcast(event, data) {
  if (io) io.emit(event, data);
}

module.exports = { initSocket, broadcast };
