import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_FILE = path.join(__dirname, 'data.json');

const initialData = {
  members: [
    {
      id: "mem_1",
      name: "Tatya Vinchu",
      rank: "leader",
      contribution: 500,
      hasPaid: true,
      joinDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      order: 1
    },
    {
      id: "mem_2",
      name: "Baba Niranjana",
      rank: "underboss",
      contribution: 300,
      hasPaid: true,
      joinDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
      order: 2
    },
    {
      id: "mem_3",
      name: "Chhota Rajan",
      rank: "enforcer",
      contribution: 200,
      hasPaid: false,
      joinDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      order: 3
    }
  ],
  announcement: {
    text: "🔥 VENDETTA GANG ORDERS: Welcome to paradise. Pay weekly dues & prepare for Syndicate meeting!",
    updatedBy: "Tatya Vinchu",
    updatedAt: new Date().toISOString()
  },
  transactions: [
    {
      id: "tx_1",
      description: "Weekly Dues Collection",
      amount: 800,
      date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      type: "income",
      category: "weekly_dues"
    },
    {
      id: "tx_2",
      description: "Safehouse Rent & Utility",
      amount: 1200,
      date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      type: "expense",
      category: "operation"
    }
  ],
  items: [
    { id: "item_1", name: "AK-47", price: 2500, category: "weapon", description: "Classic assault rifle" },
    { id: "item_2", name: "Bulletproof Vest", price: 800, category: "armor", description: "Level IIIA protection" },
    { id: "item_3", name: "Night Vision Goggles", price: 1200, category: "equipment", description: "See in the dark" },
    { id: "item_4", name: "Encrypted Radio", price: 300, category: "communication", description: "Secure comms" },
    { id: "item_5", name: "Smoke Grenades", price: 150, category: "tactical", description: "Pack of 3" },
    { id: "item_6", name: "Syndicate Supply Crate", price: 5000, category: "syndicate", description: "Special Syndicate Meeting Supply Crate" },
    { id: "item_7", name: "Heavy Tactical Armor Shipment", price: 3200, category: "syndicate", description: "Military Grade Syndicate Shipment" },
    { id: "item_8", name: "Special Ops Weaponry Bundle", price: 7500, category: "syndicate", description: "Exclusive Syndicate Meeting Deal" }
  ],
  orders: [
    {
      id: "ord_1",
      memberId: "mem_1",
      memberName: "Tatya Vinchu",
      items: [
        { itemId: "item_1", itemName: "AK-47", quantity: 1, price: 2500 },
        { itemId: "item_2", itemName: "Bulletproof Vest", quantity: 1, price: 800 }
      ],
      totalAmount: 3300,
      status: "approved",
      orderDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
    }
  ],
  gangfund: {
    id: "main",
    baseAmount: 20000,
    lastUpdated: new Date().toISOString(),
    updatedBy: "system"
  },
  weeklyPaymentRecords: [],
  auditLogs: [],
  streams: [
    {
      id: "stream_1",
      memberName: "Tatya Vinchu",
      platform: "kick",
      channelSlug: "vendetta",
      title: "🔴 VENDETTA LEADER | SoulCity GTA RP Patrol",
      isLive: true,
      addedBy: "Leader",
      createdAt: new Date().toISOString()
    },
    {
      id: "stream_2",
      memberName: "Baba Niranjana",
      platform: "youtube",
      channelSlug: "dQw4w9WgXcQ",
      title: "🗡️ SYNDICATE HEIST & PATROL",
      isLive: true,
      addedBy: "Underboss",
      createdAt: new Date().toISOString()
    }
  ]
};

class Database {
  constructor() {
    this.data = initialData;
    this.init();
  }

  init() {
    const backupFile = DB_FILE + '.bak';
    try {
      if (fs.existsSync(DB_FILE)) {
        const fileContent = fs.readFileSync(DB_FILE, 'utf-8');
        if (fileContent && fileContent.trim().length > 0) {
          const parsed = JSON.parse(fileContent);
          this.data = {
            members: Array.isArray(parsed.members) ? parsed.members : initialData.members,
            announcement: parsed.announcement || initialData.announcement,
            transactions: Array.isArray(parsed.transactions) ? parsed.transactions : initialData.transactions,
            items: Array.isArray(parsed.items) ? parsed.items : initialData.items,
            orders: Array.isArray(parsed.orders) ? parsed.orders : initialData.orders,
            gangfund: parsed.gangfund || initialData.gangfund,
            weeklyPaymentRecords: Array.isArray(parsed.weeklyPaymentRecords) ? parsed.weeklyPaymentRecords : [],
            auditLogs: Array.isArray(parsed.auditLogs) ? parsed.auditLogs : [],
            streams: Array.isArray(parsed.streams) ? parsed.streams : initialData.streams
          };
          this.saveBackup();
          return;
        }
      }

      // Fallback to backup file if primary file is corrupted or locked
      if (fs.existsSync(backupFile)) {
        const backupContent = fs.readFileSync(backupFile, 'utf-8');
        if (backupContent && backupContent.trim().length > 0) {
          const parsed = JSON.parse(backupContent);
          this.data = { ...initialData, ...parsed };
          this.save();
          return;
        }
      }

      this.save();
    } catch (err) {
      console.error('Database load warning (retaining state, avoiding data wipe):', err);
    }
  }

  saveBackup() {
    try {
      const backupFile = DB_FILE + '.bak';
      fs.writeFileSync(backupFile, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (e) {
      // Ignore backup write error
    }
  }

  save() {
    try {
      const tmpFile = DB_FILE + '.tmp';
      fs.writeFileSync(tmpFile, JSON.stringify(this.data, null, 2), 'utf-8');
      fs.renameSync(tmpFile, DB_FILE);
      this.saveBackup();
    } catch (err) {
      console.error('Failed to save database file:', err);
    }
  }

  // Members CRUD
  getMembers() {
    return [...this.data.members].sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  addMember(member) {
    const newMember = {
      id: `mem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      order: this.data.members.length + 1,
      joinDate: new Date().toISOString(),
      hasPaid: false,
      contribution: 100,
      ...member
    };
    this.data.members.push(newMember);
    this.save();
    return newMember;
  }

  updateMember(id, updates) {
    const index = this.data.members.findIndex(m => m.id === id);
    if (index !== -1) {
      this.data.members[index] = { ...this.data.members[index], ...updates };
      this.save();
      return this.data.members[index];
    }
    return null;
  }

  batchUpdateMembers(updatesList) {
    updatesList.forEach(({ id, updates }) => {
      const index = this.data.members.findIndex(m => m.id === id);
      if (index !== -1) {
        this.data.members[index] = { ...this.data.members[index], ...updates };
      }
    });
    this.save();
    return this.getMembers();
  }

  deleteMember(id) {
    const initialLen = this.data.members.length;
    this.data.members = this.data.members.filter(m => m.id !== id);
    if (this.data.members.length !== initialLen) {
      this.save();
      return true;
    }
    return false;
  }

  // Transactions CRUD
  getTransactions() {
    return [...this.data.transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  addTransaction(tx) {
    const newTx = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      date: new Date().toISOString(),
      ...tx
    };
    this.data.transactions.unshift(newTx);
    this.save();
    return newTx;
  }

  deleteTransaction(id) {
    const initialLen = this.data.transactions.length;
    this.data.transactions = this.data.transactions.filter(t => t.id !== id);
    if (this.data.transactions.length !== initialLen) {
      this.save();
      return true;
    }
    return false;
  }

  // Items CRUD
  getItems() {
    return [...this.data.items].sort((a, b) => a.name.localeCompare(b.name));
  }

  addItem(item) {
    const newItem = {
      id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      ...item
    };
    this.data.items.push(newItem);
    this.save();
    return newItem;
  }

  updateItem(id, updates) {
    const index = this.data.items.findIndex(i => i.id === id);
    if (index !== -1) {
      this.data.items[index] = { ...this.data.items[index], ...updates };
      this.save();
      return this.data.items[index];
    }
    return null;
  }

  deleteItem(id) {
    const initialLen = this.data.items.length;
    this.data.items = this.data.items.filter(i => i.id !== id);
    if (this.data.items.length !== initialLen) {
      this.save();
      return true;
    }
    return false;
  }

  // Orders CRUD
  getOrders() {
    return [...this.data.orders].sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate));
  }

  addOrder(order) {
    const newOrder = {
      id: `ord_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      orderDate: new Date().toISOString(),
      status: 'pending',
      ...order
    };
    this.data.orders.unshift(newOrder);
    this.save();
    return newOrder;
  }

  updateOrder(id, updates) {
    const index = this.data.orders.findIndex(o => o.id === id);
    if (index !== -1) {
      this.data.orders[index] = { ...this.data.orders[index], ...updates };
      this.save();
      return this.data.orders[index];
    }
    return null;
  }

  deleteOrder(id) {
    const initialLen = this.data.orders.length;
    this.data.orders = this.data.orders.filter(o => o.id !== id);
    if (this.data.orders.length !== initialLen) {
      this.save();
      return true;
    }
    return false;
  }

  // Gang Fund CRUD
  getGangFund() {
    return this.data.gangfund;
  }

  updateGangFund(baseAmount, updatedBy) {
    this.data.gangfund = {
      id: "main",
      baseAmount: Number(baseAmount),
      lastUpdated: new Date().toISOString(),
      updatedBy: updatedBy || "admin"
    };
    this.save();
    return this.data.gangfund;
  }

  // Weekly Payment Records & Audit Logs
  getWeeklyPaymentRecords() {
    return [...this.data.weeklyPaymentRecords].sort((a, b) => b.weekNumber - a.weekNumber);
  }

  findWeeklyPaymentRecord(memberId, weekNumber) {
    return this.data.weeklyPaymentRecords.find(r => r.memberId === memberId && r.weekNumber === weekNumber) || null;
  }

  upsertWeeklyPaymentRecord(record) {
    const existingIndex = this.data.weeklyPaymentRecords.findIndex(
      r => r.memberId === record.memberId && r.weekNumber === record.weekNumber
    );

    if (existingIndex !== -1) {
      this.data.weeklyPaymentRecords[existingIndex] = {
        ...this.data.weeklyPaymentRecords[existingIndex],
        ...record,
        markedAt: new Date().toISOString()
      };
      this.save();
      return this.data.weeklyPaymentRecords[existingIndex];
    } else {
      const newRec = {
        id: `rec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        markedAt: new Date().toISOString(),
        ...record
      };
      this.data.weeklyPaymentRecords.push(newRec);
      this.save();
      return newRec;
    }
  }

  deleteWeeklyPaymentRecord(id) {
    const initialLen = this.data.weeklyPaymentRecords.length;
    this.data.weeklyPaymentRecords = this.data.weeklyPaymentRecords.filter(r => r.id !== id);
    if (this.data.weeklyPaymentRecords.length !== initialLen) {
      this.save();
      return true;
    }
    return false;
  }

  getAuditLogs() {
    return [...this.data.auditLogs].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  addAuditLog(log) {
    const newLog = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
      ...log
    };
    this.data.auditLogs.unshift(newLog);
    this.save();
    return newLog;
  }

  // Gang Announcement
  getAnnouncement() {
    return this.data.announcement || {
      text: "🔥 VENDETTA GANG ORDERS: Welcome to paradise. Pay weekly dues & prepare for Syndicate meeting!",
      updatedBy: "Tatya Vinchu",
      updatedAt: new Date().toISOString()
    };
  }

  updateAnnouncement(text, updatedBy) {
    this.data.announcement = {
      text,
      updatedBy: updatedBy || "Leader",
      updatedAt: new Date().toISOString()
    };
    this.save();
    return this.data.announcement;
  }

  // Stream Channels
  getStreams() {
    if (!Array.isArray(this.data.streams)) {
      this.data.streams = [
        {
          id: "stream_1",
          memberName: "Tatya Vinchu",
          platform: "kick",
          channelSlug: "vendetta",
          title: "🔴 VENDETTA LEADER | GTA RP Live Patrol",
          isLive: true,
          addedBy: "Leader",
          createdAt: new Date().toISOString()
        },
        {
          id: "stream_2",
          memberName: "Baba Niranjana",
          platform: "youtube",
          channelSlug: "dQw4w9WgXcQ",
          title: "🗡️ SYNDICATE HEIST & PATROL",
          isLive: true,
          addedBy: "Underboss",
          createdAt: new Date().toISOString()
        }
      ];
      this.save();
    }
    return this.data.streams;
  }

  addStream(stream) {
    if (!Array.isArray(this.data.streams)) {
      this.data.streams = [];
    }
    const newStream = {
      id: `stream_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
      isLive: true,
      ...stream
    };
    this.data.streams.unshift(newStream);
    this.save();
    return newStream;
  }

  deleteStream(id) {
    if (!Array.isArray(this.data.streams)) return false;
    const initialLen = this.data.streams.length;
    this.data.streams = this.data.streams.filter(s => s.id !== id);
    if (this.data.streams.length !== initialLen) {
      this.save();
      return true;
    }
    return false;
  }
}

export const db = new Database();
