import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_FILE = path.join(__dirname, 'data.json');

// Supabase Configuration
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://lyncsdadhhkaxogokbpr.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_QklPi2e9OgOfKXzrOMrQEA_spm4ShTV';

export const supabase = createClient(supabaseUrl, supabaseKey);

// Safe background Supabase query runner (handles PostgrestFilterBuilder without throwing)
async function runSupabase(queryFn) {
  try {
    const res = await queryFn();
    if (res?.error) {
      console.error('Supabase query error:', res.error.message);
    }
    return res;
  } catch (err) {
    console.error('Supabase execution exception:', err.message);
    return null;
  }
}

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
      category: "arsenal",
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

  async init() {
    // 1. Load from local cache first for instantaneous startup
    try {
      if (fs.existsSync(DB_FILE)) {
        const fileContent = fs.readFileSync(DB_FILE, 'utf-8');
        if (fileContent && fileContent.trim().length > 0) {
          const parsed = JSON.parse(fileContent);
          this.data = { ...initialData, ...parsed };
        }
      }
    } catch (err) {
      console.warn('Initial local DB load notice:', err.message);
    }

    // 2. Fetch fresh synchronized data from Supabase Cloud
    await this.syncFromSupabase();
  }

  async syncFromSupabase() {
    try {
      // Sync Members
      const { data: members } = await supabase.from('members').select('*').order('order', { ascending: true });
      if (members && members.length > 0) {
        this.data.members = members.map(m => ({
          id: m.id,
          name: m.name,
          rank: m.rank,
          contribution: Number(m.contribution || 0),
          hasPaid: Boolean(m.has_paid),
          joinDate: m.join_date || m.created_at,
          order: m.order || 0
        }));
      }

      // Sync Transactions
      const { data: txs } = await supabase.from('transactions').select('*').order('date', { ascending: false });
      if (txs && txs.length > 0) {
        this.data.transactions = txs.map(t => ({
          id: t.id,
          description: t.description,
          amount: Number(t.amount || 0),
          date: t.date,
          type: t.type,
          category: t.category
        }));
      }

      // Sync Items
      const { data: items } = await supabase.from('items').select('*').order('name', { ascending: true });
      if (items && items.length > 0) {
        this.data.items = items.map(i => ({
          id: i.id,
          name: i.name,
          price: Number(i.price || 0),
          category: i.category,
          description: i.description
        }));
      }

      // Sync Orders
      const { data: orders } = await supabase.from('orders').select('*').order('order_date', { ascending: false });
      if (orders && orders.length > 0) {
        this.data.orders = orders.map(o => ({
          id: o.id,
          memberId: o.member_id,
          memberName: o.member_name,
          items: o.items || [],
          totalAmount: Number(o.total_amount || 0),
          status: o.status,
          category: o.category || 'arsenal',
          orderDate: o.order_date
        }));
      }

      // Sync Gang Fund
      const { data: gangfund } = await supabase.from('gangfund').select('*').limit(1);
      if (gangfund && gangfund.length > 0) {
        this.data.gangfund = {
          id: gangfund[0].id,
          baseAmount: Number(gangfund[0].base_amount || 0),
          lastUpdated: gangfund[0].last_updated,
          updatedBy: gangfund[0].updated_by
        };
      }

      // Sync Streams
      const { data: streams } = await supabase.from('streams').select('*').order('created_at', { ascending: false });
      if (streams && streams.length > 0) {
        this.data.streams = streams.map(s => ({
          id: s.id,
          memberName: s.member_name,
          platform: s.platform,
          channelSlug: s.channel_slug,
          title: s.title,
          isLive: Boolean(s.is_live),
          addedBy: s.added_by,
          createdAt: s.created_at
        }));
      }

      // Sync Weekly Payment Records
      const { data: records } = await supabase.from('weekly_payment_records').select('*').order('week_number', { ascending: false });
      if (records && records.length > 0) {
        this.data.weeklyPaymentRecords = records.map(r => ({
          id: r.id,
          memberId: r.member_id,
          memberName: r.member_name,
          weekStart: r.week_start,
          weekEnd: r.week_end,
          weekNumber: Number(r.week_number),
          contribution: Number(r.contribution || 0),
          hasPaid: Boolean(r.has_paid),
          paymentDate: r.payment_date,
          markedBy: r.marked_by,
          markedAt: r.marked_at,
          notes: r.notes
        }));
      }

      this.save();
    } catch (err) {
      console.error('Failed to sync from Supabase:', err);
    }
  }

  save() {
    try {
      const tmpFile = DB_FILE + '.tmp';
      fs.writeFileSync(tmpFile, JSON.stringify(this.data, null, 2), 'utf-8');
      fs.renameSync(tmpFile, DB_FILE);
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

    // Persist to Supabase in background
    runSupabase(() => supabase.from('members').insert({
      id: newMember.id,
      name: newMember.name,
      rank: newMember.rank || 'recruit',
      contribution: newMember.contribution || 100,
      has_paid: Boolean(newMember.hasPaid),
      join_date: newMember.joinDate,
      order: newMember.order || 1
    }));

    return newMember;
  }

  updateMember(id, updates) {
    const index = this.data.members.findIndex(m => m.id === id);
    if (index !== -1) {
      this.data.members[index] = { ...this.data.members[index], ...updates };
      this.save();

      // Persist to Supabase in background
      const dbUpdates = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.rank !== undefined) dbUpdates.rank = updates.rank;
      if (updates.contribution !== undefined) dbUpdates.contribution = updates.contribution;
      if (updates.hasPaid !== undefined) dbUpdates.has_paid = updates.hasPaid;
      if (updates.order !== undefined) dbUpdates.order = updates.order;
      if (updates.joinDate !== undefined) dbUpdates.join_date = updates.joinDate;

      runSupabase(() => supabase.from('members').update(dbUpdates).eq('id', id));

      return this.data.members[index];
    }
    return null;
  }

  batchUpdateMembers(updatesList) {
    updatesList.forEach(({ id, updates }) => {
      this.updateMember(id, updates);
    });
    return this.getMembers();
  }

  deleteMember(id) {
    const initialLen = this.data.members.length;
    this.data.members = this.data.members.filter(m => m.id !== id);
    if (this.data.members.length !== initialLen) {
      this.save();
      runSupabase(() => supabase.from('members').delete().eq('id', id));
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

    runSupabase(() => supabase.from('transactions').insert({
      id: newTx.id,
      description: newTx.description,
      amount: newTx.amount,
      type: newTx.type,
      category: newTx.category,
      date: newTx.date
    }));

    return newTx;
  }

  deleteTransaction(id) {
    const initialLen = this.data.transactions.length;
    this.data.transactions = this.data.transactions.filter(t => t.id !== id);
    if (this.data.transactions.length !== initialLen) {
      this.save();
      runSupabase(() => supabase.from('transactions').delete().eq('id', id));
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

    runSupabase(() => supabase.from('items').insert({
      id: newItem.id,
      name: newItem.name,
      price: newItem.price,
      category: newItem.category,
      description: newItem.description
    }));

    return newItem;
  }

  updateItem(id, updates) {
    const index = this.data.items.findIndex(i => i.id === id);
    if (index !== -1) {
      this.data.items[index] = { ...this.data.items[index], ...updates };
      this.save();

      runSupabase(() => supabase.from('items').update(updates).eq('id', id));
      return this.data.items[index];
    }
    return null;
  }

  deleteItem(id) {
    const initialLen = this.data.items.length;
    this.data.items = this.data.items.filter(i => i.id !== id);
    if (this.data.items.length !== initialLen) {
      this.save();
      runSupabase(() => supabase.from('items').delete().eq('id', id));
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
      category: order.category || 'arsenal',
      ...order
    };
    this.data.orders.unshift(newOrder);
    this.save();

    runSupabase(() => supabase.from('orders').insert({
      id: newOrder.id,
      member_id: newOrder.memberId,
      member_name: newOrder.memberName,
      items: newOrder.items,
      total_amount: newOrder.totalAmount,
      status: newOrder.status,
      category: newOrder.category,
      order_date: newOrder.orderDate
    }));

    return newOrder;
  }

  updateOrder(id, updates) {
    const index = this.data.orders.findIndex(o => o.id === id);
    if (index !== -1) {
      this.data.orders[index] = { ...this.data.orders[index], ...updates };
      this.save();

      const dbUpdates = {};
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.totalAmount !== undefined) dbUpdates.total_amount = updates.totalAmount;
      if (updates.items !== undefined) dbUpdates.items = updates.items;
      if (updates.category !== undefined) dbUpdates.category = updates.category;

      runSupabase(() => supabase.from('orders').update(dbUpdates).eq('id', id));

      return this.data.orders[index];
    }
    return null;
  }

  deleteOrder(id) {
    const initialLen = this.data.orders.length;
    this.data.orders = this.data.orders.filter(o => o.id !== id);
    if (this.data.orders.length !== initialLen) {
      this.save();
      runSupabase(() => supabase.from('orders').delete().eq('id', id));
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

    runSupabase(() => supabase.from('gangfund').upsert({
      id: "main",
      base_amount: Number(baseAmount),
      last_updated: this.data.gangfund.lastUpdated,
      updated_by: this.data.gangfund.updatedBy
    }));

    return this.data.gangfund;
  }

  // Weekly Payment Records & Audit Logs
  getWeeklyPaymentRecords() {
    return [...this.data.weeklyPaymentRecords].sort((a, b) => b.weekNumber - a.weekNumber);
  }

  upsertWeeklyPaymentRecord(record) {
    const id = record.id || `rec_${record.memberId}_${record.weekNumber}`;
    const markedAt = new Date().toISOString();
    const formattedRec = {
      id,
      markedAt,
      ...record
    };

    const existingIndex = this.data.weeklyPaymentRecords.findIndex(
      r => (r.id === id) || (r.memberId === record.memberId && r.weekNumber === record.weekNumber)
    );

    if (existingIndex !== -1) {
      this.data.weeklyPaymentRecords[existingIndex] = formattedRec;
    } else {
      this.data.weeklyPaymentRecords.push(formattedRec);
    }
    this.save();

    runSupabase(() => supabase.from('weekly_payment_records').upsert({
      id,
      member_id: record.memberId,
      member_name: record.memberName,
      week_start: record.weekStart,
      week_end: record.weekEnd,
      week_number: record.weekNumber,
      contribution: record.contribution,
      has_paid: Boolean(record.hasPaid),
      payment_date: record.paymentDate || (record.hasPaid ? new Date().toISOString() : null),
      marked_by: record.markedBy || 'admin',
      marked_at: markedAt,
      notes: record.notes || ''
    }));

    return formattedRec;
  }

  deleteWeeklyPaymentRecord(id) {
    const initialLen = this.data.weeklyPaymentRecords.length;
    this.data.weeklyPaymentRecords = this.data.weeklyPaymentRecords.filter(r => r.id !== id);
    if (this.data.weeklyPaymentRecords.length !== initialLen) {
      this.save();
      runSupabase(() => supabase.from('weekly_payment_records').delete().eq('id', id));
      return true;
    }
    return false;
  }

  getAuditLogs() {
    return this.getWeeklyPaymentRecords().map(r => ({
      id: r.id,
      weekStart: r.weekStart,
      weekEnd: r.weekEnd,
      weekNumber: r.weekNumber,
      memberId: r.memberId,
      memberName: r.memberName,
      hasPaid: r.hasPaid,
      contribution: r.contribution,
      paymentDate: r.paymentDate,
      createdAt: r.markedAt
    }));
  }

  // Gang Announcement
  getAnnouncement() {
    return this.data.announcement || initialData.announcement;
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

  // Streams
  getStreams() {
    return this.data.streams || initialData.streams;
  }

  addStream(stream) {
    const newStream = {
      id: `stream_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
      isLive: true,
      ...stream
    };
    if (!Array.isArray(this.data.streams)) this.data.streams = [];
    this.data.streams.unshift(newStream);
    this.save();

    runSupabase(() => supabase.from('streams').insert({
      id: newStream.id,
      member_name: newStream.memberName,
      platform: newStream.platform,
      channel_slug: newStream.channelSlug,
      title: newStream.title || 'Live Stream',
      is_live: Boolean(newStream.isLive),
      added_by: newStream.addedBy || 'Leader'
    }));

    return newStream;
  }

  deleteStream(id) {
    if (!Array.isArray(this.data.streams)) return false;
    const initialLen = this.data.streams.length;
    this.data.streams = this.data.streams.filter(s => s.id !== id);
    if (this.data.streams.length !== initialLen) {
      this.save();
      runSupabase(() => supabase.from('streams').delete().eq('id', id));
      return true;
    }
    return false;
  }
}

export const db = new Database();
