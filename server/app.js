import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file manually if present
const envPath = path.join(__dirname, '..', '.env');
function loadEnv() {
  if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf-8');
    envConfig.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...values] = trimmed.split('=');
        if (key && values.length > 0) {
          process.env[key.trim()] = values.join('=').trim();
        }
      }
    });
  }
}
loadEnv();

export const app = express();

app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());

// Helper for dynamic host/origin detection
function getBaseUrl(req) {
  const forwardedProto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:8080';
  const proto = host.includes('localhost') ? 'http' : forwardedProto;
  return `${proto}://${host}`;
}

// SSE Clients Registry
let sseClients = [];

function broadcastChange(eventType, data) {
  const payload = `data: ${JSON.stringify({ type: eventType, data, timestamp: new Date().toISOString() })}\n\n`;
  sseClients.forEach(client => {
    try {
      client.res.write(payload);
    } catch {}
  });
}

// SSE Endpoint for Live Sync
app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const clientId = Date.now();
  const newClient = { id: clientId, res };
  sseClients.push(newClient);

  req.on('close', () => {
    sseClients = sseClients.filter(client => client.id !== clientId);
  });
});

// Authentication Endpoints

// 1. Initiate Discord OAuth2 Login
app.get('/api/auth/discord/login', (req, res) => {
  loadEnv();
  const mode = req.query.mode || 'gangmember';
  const clientId = process.env.DISCORD_CLIENT_ID || '1543516731354382438';
  const baseUrl = getBaseUrl(req);
  const redirectUri = process.env.DISCORD_REDIRECT_URI || `${baseUrl}/api/auth/discord/callback`;

  if (!clientId || clientId === 'your_discord_client_id_here') {
    const token = `fyb_discord_dev_token_${mode}_${Date.now()}`;
    return res.redirect(`${baseUrl}/?token=${token}&mode=${mode}&username=DevUser_${mode}`);
  }

  const discordAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=identify&state=${mode}`;
  res.redirect(discordAuthUrl);
});

// 2. Discord OAuth2 Callback Endpoint
app.get('/api/auth/discord/callback', async (req, res) => {
  loadEnv();
  const { code, state: mode } = req.query;
  const targetMode = mode || 'gangmember';
  const baseUrl = getBaseUrl(req);

  const clientId = process.env.DISCORD_CLIENT_ID || '1543516731354382438';
  const clientSecret = process.env.DISCORD_CLIENT_SECRET || 'bsk4osneeUlV3qVS1acTnmG5fp5CGZ-_';
  const redirectUri = process.env.DISCORD_REDIRECT_URI || `${baseUrl}/api/auth/discord/callback`;

  if (!code || !clientId || !clientSecret || clientId === 'your_discord_client_id_here') {
    const token = `fyb_discord_dev_token_${targetMode}_${Date.now()}`;
    return res.redirect(`${baseUrl}/?token=${token}&mode=${targetMode}&username=DiscordUser`);
  }

  try {
    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        code: code.toString(),
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || !tokenData.access_token) {
      console.error('Discord OAuth Token Error:', tokenData);
      return res.redirect(`${baseUrl}/?auth_error=Failed+to+authenticate+with+Discord`);
    }

    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const userData = await userResponse.json();
    const username = userData.global_name || userData.username || 'DiscordUser';
    const discordId = userData.id;

    const adminIds = (process.env.ADMIN_DISCORD_IDS || '879604109366394880').split(',').map(id => id.trim()).filter(Boolean);
    const memberIds = (process.env.MEMBER_DISCORD_IDS || '879604109366394880').split(',').map(id => id.trim()).filter(Boolean);

    const isAdmin = adminIds.includes(discordId);
    const isMember = memberIds.includes(discordId);

    let finalMode = 'gangmember';

    if (targetMode === 'admin') {
      if (!isAdmin) {
        return res.redirect(`${baseUrl}/?auth_error=Access+Denied:+Discord+ID+${discordId}+is+not+authorized+for+Leader+access.`);
      }
      finalMode = 'admin';
    } else {
      if (!isMember && !isAdmin) {
        return res.redirect(`${baseUrl}/?auth_error=Access+Denied:+Discord+ID+${discordId}+is+not+authorized+for+Member+access.`);
      }
      finalMode = 'gangmember';
    }

    const token = `fyb_discord_${discordId}_${Date.now()}`;
    return res.redirect(`${baseUrl}/?token=${token}&mode=${finalMode}&username=${encodeURIComponent(username)}`);
  } catch (error) {
    console.error('Discord Auth Exception:', error);
    return res.redirect(`${baseUrl}/?auth_error=Authentication+Failed`);
  }
});

// 3. Direct Login API
app.post('/api/auth/login', (req, res) => {
  const { mode, password } = req.body;
  const selectedMode = mode || 'gangmember';
  const adminPassword = "YK789";
  const gangMemberPassword = "takla";

  if (
    (selectedMode === "admin" && password === adminPassword) ||
    (selectedMode === "gangmember" && password === gangMemberPassword)
  ) {
    return res.json({
      success: true,
      mode: selectedMode,
      token: `fyb_token_${selectedMode}_${Date.now()}`
    });
  }

  return res.status(401).json({
    success: false,
    message: "Invalid credentials! Access Denied."
  });
});

// Members Endpoints
app.get('/api/members', (req, res) => {
  res.json(db.getMembers());
});

app.post('/api/members', (req, res) => {
  const member = db.addMember(req.body);
  broadcastChange('members_updated', db.getMembers());
  res.status(201).json(member);
});

app.put('/api/members/:id', (req, res) => {
  const updated = db.updateMember(req.params.id, req.body);
  if (updated) {
    broadcastChange('members_updated', db.getMembers());
    return res.json(updated);
  }
  res.status(404).json({ error: "Member not found" });
});

app.post('/api/members/batch-update', (req, res) => {
  const { updates } = req.body;
  const updatedMembers = db.batchUpdateMembers(updates || []);
  broadcastChange('members_updated', updatedMembers);
  res.json(updatedMembers);
});

app.delete('/api/members/:id', (req, res) => {
  const success = db.deleteMember(req.params.id);
  if (success) {
    broadcastChange('members_updated', db.getMembers());
    return res.json({ success: true });
  }
  res.status(404).json({ error: "Member not found" });
});

// Transactions Endpoints
app.get('/api/transactions', (req, res) => {
  res.json(db.getTransactions());
});

app.post('/api/transactions', (req, res) => {
  const tx = db.addTransaction(req.body);
  broadcastChange('transactions_updated', db.getTransactions());
  res.status(201).json(tx);
});

app.delete('/api/transactions/:id', (req, res) => {
  const success = db.deleteTransaction(req.params.id);
  if (success) {
    broadcastChange('transactions_updated', db.getTransactions());
    return res.json({ success: true });
  }
  res.status(404).json({ error: "Transaction not found" });
});

// Items Endpoints
app.get('/api/items', (req, res) => {
  res.json(db.getItems());
});

app.post('/api/items', (req, res) => {
  const item = db.addItem(req.body);
  broadcastChange('items_updated', db.getItems());
  res.status(201).json(item);
});

app.put('/api/items/:id', (req, res) => {
  const updated = db.updateItem(req.params.id, req.body);
  if (updated) {
    broadcastChange('items_updated', db.getItems());
    return res.json(updated);
  }
  res.status(404).json({ error: "Item not found" });
});

app.delete('/api/items/:id', (req, res) => {
  const success = db.deleteItem(req.params.id);
  if (success) {
    broadcastChange('items_updated', db.getItems());
    return res.json({ success: true });
  }
  res.status(404).json({ error: "Item not found" });
});

// Orders Endpoints
app.get('/api/orders', (req, res) => {
  res.json(db.getOrders());
});

app.post('/api/orders', (req, res) => {
  const order = db.addOrder(req.body);
  broadcastChange('orders_updated', db.getOrders());
  res.status(201).json(order);
});

app.put('/api/orders/:id', (req, res) => {
  const existingOrder = db.getOrders().find(o => o.id === req.params.id);
  const updated = db.updateOrder(req.params.id, req.body);
  
  if (updated) {
    if (updated.status === 'completed' && (!existingOrder || existingOrder.status !== 'completed')) {
      const isSyndicate = updated.category === 'syndicate';
      const categoryLabel = isSyndicate ? 'Syndicate Deal' : 'Arsenal Order';
      const categoryKey = isSyndicate ? 'syndicate_deal' : 'arsenal_order';
      
      const itemSummary = updated.items && updated.items.length > 0 
        ? updated.items.map(i => `${i.quantity}x ${i.itemName}`).join(', ')
        : 'Gear';

      db.addTransaction({
        description: `${categoryLabel} Income: ${updated.memberName} (${itemSummary})`,
        amount: updated.totalAmount,
        type: 'income',
        category: categoryKey,
        date: new Date().toISOString()
      });

      const currentFund = db.getGangFund();
      const newBase = (currentFund.baseAmount || 0) + Number(updated.totalAmount);
      db.updateGangFund(newBase, `${categoryLabel} Payment: ${updated.memberName}`);

      broadcastChange('transactions_updated', db.getTransactions());
      broadcastChange('gangfund_updated', db.getGangFund());
    }

    broadcastChange('orders_updated', db.getOrders());
    return res.json(updated);
  }
  res.status(404).json({ error: "Order not found" });
});

app.delete('/api/orders/:id', (req, res) => {
  const success = db.deleteOrder(req.params.id);
  if (success) {
    broadcastChange('orders_updated', db.getOrders());
    return res.json({ success: true });
  }
  res.status(404).json({ error: "Order not found" });
});

// Gang Fund Endpoints
app.get('/api/gangfund', (req, res) => {
  res.json(db.getGangFund());
});

app.put('/api/gangfund', (req, res) => {
  const { baseAmount, updatedBy } = req.body;
  const updated = db.updateGangFund(baseAmount, updatedBy);
  broadcastChange('gangfund_updated', updated);
  res.json(updated);
});

// Gang Announcement Endpoints
app.get('/api/announcement', (req, res) => {
  res.json(db.getAnnouncement());
});

app.put('/api/announcement', (req, res) => {
  const { text, updatedBy } = req.body;
  const updated = db.updateAnnouncement(text, updatedBy);
  broadcastChange('announcement_updated', updated);
  res.json(updated);
});

// Weekly Payment Records & Audit Logs Endpoints
app.get('/api/weekly-payment-records', (req, res) => {
  res.json(db.getWeeklyPaymentRecords());
});

app.post('/api/weekly-payment-records/upsert', (req, res) => {
  const record = db.upsertWeeklyPaymentRecord(req.body);
  broadcastChange('weekly_payments_updated', db.getWeeklyPaymentRecords());
  res.json(record);
});

app.delete('/api/weekly-payment-records/:id', (req, res) => {
  const success = db.deleteWeeklyPaymentRecord(req.params.id);
  if (success) {
    broadcastChange('weekly_payments_updated', db.getWeeklyPaymentRecords());
    return res.json({ success: true });
  }
  res.status(404).json({ error: "Record not found" });
});

app.get('/api/audit-logs', (req, res) => {
  res.json(db.getAuditLogs());
});

// Live Stream Channels Endpoints
app.get('/api/streams', (req, res) => {
  res.json(db.getStreams());
});

app.post('/api/streams', (req, res) => {
  const newStream = db.addStream(req.body);
  broadcastChange('streams_updated', db.getStreams());
  res.status(201).json(newStream);
});

app.delete('/api/streams/:id', (req, res) => {
  const success = db.deleteStream(req.params.id);
  if (success) {
    broadcastChange('streams_updated', db.getStreams());
    return res.json({ success: true });
  }
  res.status(404).json({ error: "Stream not found" });
});

// CSV Report Export Endpoint
app.get('/api/export/csv', (req, res) => {
  const type = req.query.type || 'transactions';

  if (type === 'transactions') {
    const txs = db.getTransactions();
    let csv = 'ID,Date,Description,Category,Type,Amount\n';
    txs.forEach(t => {
      csv += `"${t.id}","${t.date}","${t.description.replace(/"/g, '""')}","${t.category}","${t.type}",${t.amount}\n`;
    });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="money_moves_report.csv"');
    return res.send(csv);
  } else if (type === 'auditlogs') {
    const records = db.getWeeklyPaymentRecords();
    let csv = 'ID,Member,WeekNumber,Contribution,HasPaid,MarkedBy,MarkedAt\n';
    records.forEach(r => {
      csv += `"${r.id}","${r.memberName}",${r.weekNumber},${r.contribution},${r.hasPaid ? 'YES' : 'NO'},"${r.markedBy}","${r.markedAt}"\n`;
    });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="weekly_audit_report.csv"');
    return res.send(csv);
  }

  res.status(400).json({ error: "Invalid export type" });
});

export default app;
