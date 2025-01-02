const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const jsonServer = require('json-server');
const multer = require('multer'); // Import multer
require('dotenv').config();
const cors = require('cors');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Save files to the 'uploads' folder
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`); // Unique file name
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  },
});

// Socket.IO server
const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
      origin: process.env.frontEndURL,
        methods: ["GET", "POST"],
    },
});

const users = {}; // Map to store connected users and their IDs

// Enable CORS for all routes
app.use(
  cors({
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true,
  })
);

// JSON Server integration
const middleWare = jsonServer.defaults();
const route = jsonServer.router('db.json');
app.use('/api', middleWare, route); // Combine JSON Server into the same port

// Static folder for serving uploaded files
app.use('/uploads', express.static('uploads'));

app.post('/uploads', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }
  res.json({
    fileName: req.file.filename,
    filePath: `/uploads/${req.file.filename}`,
  });
});

// Serve a simple message at the root URL
app.get('/', (req, res) => {
  res.send('Socket.IO Server is running.');
});

// Handle Socket.IO connections
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Listen for user registration
  socket.on('register', (userId) => {
      users[userId] = socket.id;
      console.log(`User login: ${userId}`);
      io.emit('user_status_change', { userId, status: 'online' });
  });

  // Listen for private messages
  socket.on('private_message', (data) => {
    const { sender, receiver, messageBody } = data;
    const receiverSocketId = users[receiver]; // Get the receiver's socket ID

    if (receiverSocketId) {
        io.to(receiverSocketId).emit('private_message', {
            sender,
            receiver,
            messageBody,
        });
    } else {
        console.log(`Receiver ${receiver} not connected`);
    }

    // Emit the message back to the sender as well, so it can display their own messages
    io.to(socket.id).emit('private_message', {
        sender,
        receiver,
        messageBody,
    });
});

  // Handle disconnect
  socket.on('disconnect', () => {
      console.log('A user disconnected:', socket.id);
      for (const [userId, socketId] of Object.entries(users)) {
          if (socketId === socket.id) {
              delete users[userId];

              io.emit('user_status_change', { userId, status: 'offline' });
              break;
          }
      }
  });
});

// Start the server
const PORT = 8000;
server.listen(PORT, () => {
  console.log(`Server is running on PORT: ${PORT}`);
});
