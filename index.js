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

// Endpoint for file upload
app.post('/uploads', upload.single('profilePic'), (req, res) => {
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

  // Listen for login event and join user-specific room
  socket.on('login', (userId) => {
    console.log(`User logged in with ID: ${userId}`);
    socket.join(userId);
  });

  // Listen for message event
  socket.on('sendMessage', ({ toUserId, message }) => {
    try {
      console.log(`Message from ${socket.id} to ${toUserId}: ${message}`);
      io.to(toUserId).emit('receiveMessage', { fromUserId: socket.id, message });
    } catch (error) {
      console.error('Error handling sendMessage:', error);
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('A user disconnected:', socket.id);
  });
});

// Start the server
const PORT = 8000;
server.listen(PORT, () => {
  console.log(`Server is running on PORT: ${PORT}`);
});
