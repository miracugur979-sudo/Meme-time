const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// public klasörünü statik olarak sun
app.use(express.static(path.join(__dirname, 'public')));

const rooms = {};

io.on('connection', (socket) => {
    console.log('Bir oyuncu bağlandı:', socket.id);

    // Oda Oluşturma
    socket.on('create-room', ({ roomCode, playerName, settings }) => {
        socket.join(roomCode);
        rooms[roomCode] = {
            host: socket.id,
            players: [{ id: socket.id, name: playerName, score: 0 }],
            settings: settings || { rounds: 3, timeLimit: 60 },
            gameState: 'lobby'
        };
        socket.emit('room-created', { roomCode, players: rooms[roomCode].players });
    });

    // Odaya Katılma
    socket.on('join-room', ({ roomCode, playerName }) => {
        if (rooms[roomCode]) {
            socket.join(roomCode);
            rooms[roomCode].players.push({ id: socket.id, name: playerName, score: 0 });
            io.to(roomCode).emit('player-joined', { players: rooms[roomCode].players });
        } else {
            socket.emit('error-msg', 'Oda bulunamadı!');
        }
    });

    // Bağlantı Koptuğunda
    socket.on('disconnect', () => {
        console.log('Oyuncu ayrıldı:', socket.id);
        for (let code in rooms) {
            rooms[code].players = rooms[code].players.filter(p => p.id !== socket.id);
            if (rooms[code].players.length === 0) {
                delete rooms[code];
            } else {
                io.to(code).emit('player-joined', { players: rooms[code].players });
            }
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Sunucu ${PORT} portunda çalışıyor.`);
});