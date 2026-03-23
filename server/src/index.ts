import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { SERVER_PORT } from './config.js';
import './db.js';
import { initSession, disconnect, getStatus } from './whatsapp/session.js';

// Prevent Baileys background tasks from crashing the process
process.on('uncaughtException', (err) => {
  console.error('[Process] Uncaught exception:', err.message);
});
process.on('unhandledRejection', (err) => {
  console.error('[Process] Unhandled rejection:', err);
});
import { requireAuth, verifySocketToken } from './middleware/auth.js';
import authRouter from './routes/auth.js';
import uploadRouter from './routes/upload.js';
import templateRouter from './routes/template.js';
import { createBlastRouter } from './routes/blast.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' },
});

app.use(cors());
app.use(express.json());

// Public routes
app.use('/api/auth', authRouter);

// Protected routes
app.use('/api/upload', requireAuth, uploadRouter);
app.use('/api/template', requireAuth, templateRouter);
app.use('/api/blast', requireAuth, createBlastRouter(io));

app.get('/api/status', requireAuth, (_req, res) => {
  res.json({ status: getStatus() });
});

// Serve client static files in production
const clientDist = path.join(__dirname, '../../client/dist');
app.use(express.static(clientDist));
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

// Socket.IO with auth
io.use((socket, next) => {
  const token = socket.handshake.auth.token as string | undefined;
  if (!token) {
    next(new Error('Authentication required'));
    return;
  }
  const user = verifySocketToken(token);
  if (!user) {
    next(new Error('Invalid token'));
    return;
  }
  (socket as unknown as { user: typeof user }).user = user;
  next();
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.emit('status', getStatus());

  socket.on('connect-wa', async () => {
    try {
      await initSession(io);
    } catch (err) {
      console.error('Failed to init WhatsApp session:', err);
      socket.emit('status', 'disconnected');
    }
  });

  socket.on('disconnect-wa', async () => {
    try {
      await disconnect(io);
    } catch (err) {
      console.error('Failed to logout:', err);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

httpServer.listen(SERVER_PORT, () => {
  console.log(`Server running on http://localhost:${SERVER_PORT}`);
});
