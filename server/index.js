import 'dotenv/config';
import express from 'express';
import http from 'http';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import { store, isMongoConnected, seedMongoIfEmpty } from './store.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 5000);
let rawMongoUri = (process.env.MONGODB_URI || '').trim().replace(/^["']|["']$/g, '');
// Sanitize empty query params like appName= or trailing &/?
if (rawMongoUri) {
  rawMongoUri = rawMongoUri
    .replace(/([?&])appName=(?:&|$)/gi, '$1')
    .replace(/([?&])appName$/gi, '')
    .replace(/[?&]$/, '')
    .replace(/\?&/, '?');
}
const MONGODB_URI = rawMongoUri;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'YK789';
const MEMBER_PASSWORD = process.env.MEMBER_PASSWORD || 'takla';
const ADMIN_DISCORD_IDS = (process.env.ADMIN_DISCORD_IDS || '879604109366394880')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const MEMBER_DISCORD_IDS = (process.env.MEMBER_DISCORD_IDS || '879604109366394880')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

// Connect to MongoDB Atlas if URI is provided
if (MONGODB_URI) {
  mongoose
    .connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 })
    .then(async () => {
      console.log('✅ Connected to MongoDB Atlas');
      await seedMongoIfEmpty();
    })
    .catch((err) => {
      console.warn('⚠️ MongoDB Atlas connection failed, falling back to local JSON store:', err.message);
    });
} else {
  console.log('ℹ️ No MONGODB_URI provided. Running on local JSON persistence (server/data/db.json).');
}

const app = express();
const server = http.createServer(app);

const corsOrigin = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(',').map((s) => s.trim())
  : true;

const corsOptions = {
  origin: corsOrigin,
  credentials: true,
};

const io = new Server(server, {
  cors: corsOptions,
});

app.use(cors(corsOptions));
app.use(express.json({ limit: '2mb' }));

function emit(channel, payload) {
  io.emit(channel, payload);
}

async function emitMembers() {
  emit('members', await store.getMembers());
}

async function emitTransactions() {
  emit('transactions', await store.getTransactions());
  emit('gangfund', await store.getGangFund());
}

async function emitItems() {
  emit('items', await store.getItems());
}

async function emitOrders() {
  emit('orders', await store.getOrders());
}

async function emitStreams() {
  emit('streams', await store.getStreams());
}

async function emitWeekly() {
  emit('weekly_payment_records', await store.getWeeklyPaymentRecords());
}

async function emitAnnouncement() {
  emit('announcement', await store.getAnnouncement());
}

async function emitFund() {
  emit('gangfund', await store.getGangFund());
}

io.on('connection', async (socket) => {
  try {
    socket.emit('members', await store.getMembers());
    socket.emit('transactions', await store.getTransactions());
    socket.emit('items', await store.getItems());
    socket.emit('orders', await store.getOrders());
    socket.emit('streams', await store.getStreams());
    socket.emit('weekly_payment_records', await store.getWeeklyPaymentRecords());
    socket.emit('announcement', await store.getAnnouncement());
    socket.emit('gangfund', await store.getGangFund());
  } catch (err) {
    console.error('Error sending socket initial snapshot:', err);
  }
});

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    realtime: 'socket.io',
    persistence: isMongoConnected() ? 'mongodb-atlas' : 'local-json',
  });
});

app.post('/api/auth/login', (req, res) => {
  const { mode, password } = req.body || {};
  const ok =
    (mode === 'admin' && password === ADMIN_PASSWORD) ||
    (mode === 'gangmember' && password === MEMBER_PASSWORD);

  if (!ok) {
    return res.status(401).json({
      success: false,
      mode,
      token: '',
      message: 'Invalid credentials! Access Denied.',
    });
  }

  return res.json({
    success: true,
    mode,
    token: `vendetta_${mode}_${Date.now()}`,
  });
});

app.post('/api/auth/discord/verify', (req, res) => {
  const { discordId, username, targetMode } = req.body || {};
  if (!discordId) {
    return res.status(400).json({ success: false, message: 'discordId is required' });
  }

  const effectiveAdminIds = ADMIN_DISCORD_IDS.length > 0 ? ADMIN_DISCORD_IDS : ['879604109366394880'];
  const isAdmin = effectiveAdminIds.includes(discordId);
  // Any valid authenticated Discord user can log in as a gang member unless MEMBER_DISCORD_IDS is explicitly restricted
  const isMember = MEMBER_DISCORD_IDS.length === 0 || MEMBER_DISCORD_IDS.includes(discordId) || isAdmin;

  console.log(`[Discord Auth] User: ${username} (${discordId}) | TargetMode: ${targetMode} | isAdmin: ${isAdmin} | isMember: ${isMember}`);

  if (targetMode === 'admin') {
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        message: `Access Denied: Discord ID ${discordId} (${username || 'User'}) is not in ADMIN_DISCORD_IDS. Add "${discordId}" to ADMIN_DISCORD_IDS in your .env file, or log in as Gang Member.`,
      });
    }
    return res.json({
      success: true,
      mode: 'admin',
      token: `vendetta_admin_${discordId}_${Date.now()}`,
      username: username || 'Leader',
    });
  }

  if (!isMember) {
    return res.status(403).json({
      success: false,
      message: `Access Denied: Discord ID ${discordId} (${username || 'User'}) is not authorized for Member access.`,
    });
  }

  return res.json({
    success: true,
    mode: 'gangmember',
    token: `vendetta_member_${discordId}_${Date.now()}`,
    username: username || 'GangMember',
  });
});

// Members API
app.get('/api/members', async (_req, res) => {
  try {
    res.json(await store.getMembers());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.post('/api/members', async (req, res) => {
  try {
    const member = await store.addMember(req.body || {});
    await emitMembers();
    res.json(member);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.patch('/api/members/:id', async (req, res) => {
  try {
    const member = await store.updateMember(req.params.id, req.body || {});
    if (!member) return res.status(404).json({ error: 'Member not found' });
    await emitMembers();
    res.json(member);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.delete('/api/members/:id', async (req, res) => {
  try {
    await store.deleteMember(req.params.id);
    await emitMembers();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Transactions API
app.get('/api/transactions', async (_req, res) => {
  try {
    res.json(await store.getTransactions());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.post('/api/transactions', async (req, res) => {
  try {
    const tx = await store.addTransaction(req.body || {});
    await emitTransactions();
    res.json(tx);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.delete('/api/transactions/:id', async (req, res) => {
  try {
    await store.deleteTransaction(req.params.id);
    await emitTransactions();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Items API
app.get('/api/items', async (_req, res) => {
  try {
    res.json(await store.getItems());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.post('/api/items', async (req, res) => {
  try {
    const item = await store.addItem(req.body || {});
    await emitItems();
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.patch('/api/items/:id', async (req, res) => {
  try {
    const item = await store.updateItem(req.params.id, req.body || {});
    if (!item) return res.status(404).json({ error: 'Item not found' });
    await emitItems();
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.delete('/api/items/:id', async (req, res) => {
  try {
    await store.deleteItem(req.params.id);
    await emitItems();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Orders API
app.get('/api/orders', async (_req, res) => {
  try {
    res.json(await store.getOrders());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.post('/api/orders', async (req, res) => {
  try {
    const order = await store.addOrder(req.body || {});
    await emitOrders();
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.patch('/api/orders/:id', async (req, res) => {
  try {
    const order = await store.updateOrder(req.params.id, req.body || {});
    if (!order) return res.status(404).json({ error: 'Order not found' });
    await emitOrders();
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.delete('/api/orders/:id', async (req, res) => {
  try {
    await store.deleteOrder(req.params.id);
    await emitOrders();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Gang Fund API
app.get('/api/gangfund', async (_req, res) => {
  try {
    res.json(await store.getGangFund());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.put('/api/gangfund', async (req, res) => {
  try {
    const fund = await store.updateGangFund(req.body?.baseAmount, req.body?.updatedBy);
    await emitFund();
    res.json(fund);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Announcement API
app.get('/api/announcement', async (_req, res) => {
  try {
    res.json(await store.getAnnouncement());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.put('/api/announcement', async (req, res) => {
  try {
    const announcement = await store.updateAnnouncement(req.body?.text, req.body?.updatedBy);
    await emitAnnouncement();
    res.json(announcement);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Weekly Payment Records API
app.get('/api/weekly-payment-records', async (_req, res) => {
  try {
    res.json(await store.getWeeklyPaymentRecords());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.put('/api/weekly-payment-records', async (req, res) => {
  try {
    const record = await store.upsertWeeklyPaymentRecord(req.body || {});
    await emitWeekly();
    res.json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.delete('/api/weekly-payment-records/:id', async (req, res) => {
  try {
    await store.deleteWeeklyPaymentRecord(req.params.id);
    await emitWeekly();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Streams API
app.get('/api/streams', async (_req, res) => {
  try {
    res.json(await store.getStreams());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.post('/api/streams', async (req, res) => {
  try {
    const stream = await store.addStream(req.body || {});
    await emitStreams();
    res.json(stream);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.delete('/api/streams/:id', async (req, res) => {
  try {
    await store.deleteStream(req.params.id);
    await emitStreams();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Static SPA serving or Standalone API root fallback
const distDir = path.join(__dirname, '..', 'dist');
const indexHtmlPath = path.join(distDir, 'index.html');
const hasClientBuild = fs.existsSync(indexHtmlPath);

if (hasClientBuild) {
  app.use(express.static(distDir));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) return next();
    res.sendFile(indexHtmlPath, (err) => {
      if (err) next();
    });
  });
} else {
  // API root fallback when running standalone (e.g. Railway backend deployment)
  app.get('/', (_req, res) => {
    res.json({
      status: 'online',
      service: 'Vendetta Realtime Backend',
      health: '/api/health',
      realtime: 'socket.io',
      persistence: isMongoConnected() ? 'mongodb-atlas' : 'local-json',
      timestamp: new Date().toISOString(),
    });
  });
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Vendetta realtime backend on http://localhost:${PORT}`);
});
