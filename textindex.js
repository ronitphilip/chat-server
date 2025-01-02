const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173", // Update with your frontend origin
        methods: ["GET", "POST"],
    },
});

const users = {}; // Map to store connected users and their IDs

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Listen for user registration
    socket.on('register', (userId) => {
        users[userId] = socket.id; // Map userId to the socket ID
        console.log(`User registered: ${userId}`);
    });

    // Listen for private messages
    socket.on('private_message', (data) => {
        const { sender, receiver, messageBody } = data;
        const receiverSocketId = users[receiver]; // Get the receiver's socket ID

        if (receiverSocketId) {
            io.to(receiverSocketId).emit('private_message', {
                sender,
                messageBody,
            });
        } else {
            console.log(`Receiver ${receiver} not connected`);
        }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
        console.log('A user disconnected:', socket.id);
        for (const [userId, socketId] of Object.entries(users)) {
            if (socketId === socket.id) {
                delete users[userId];
                break;
            }
        }
    });
});

const PORT = 8000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
