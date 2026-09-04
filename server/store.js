import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import {
  MemberModel,
  TransactionModel,
  ItemModel,
  OrderModel,
  StreamModel,
  WeeklyRecordModel,
  GangFundModel,
  AnnouncementModel,
} from './models.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'db.json');

function nowIso() {
  return new Date().toISOString();
}

function makeId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

const STARTER_ITEMS = [
  {
    id: 'item_starter_1',
    name: 'Combat Pistol',
    price: 2500,
    category: 'gear',
    description: 'Standard crew sidearm',
  },
  {
    id: 'item_starter_2',
    name: 'Syndicate Cut',
    price: 10000,
    category: 'syndicate',
    description: 'Weekly syndicate meeting buy-in',
  },
];

const DEFAULT_ANNOUNCEMENT = {
  id: 'main',
  text: '🔥 VENDETTA GANG ORDERS: Welcome to paradise. Pay weekly dues & prepare for Syndicate meeting!',
  updatedBy: 'Tatya Vinchu',
  updatedAt: nowIso(),
};

function defaultDb() {
  return {
    members: [],
    transactions: [],
    items: [...STARTER_ITEMS],
    orders: [],
    streams: [],
    weeklyPaymentRecords: [],
    gangFund: {
      id: 'main',
      baseAmount: 0,
      lastUpdated: nowIso(),
      updatedBy: 'system',
    },
    announcement: { ...DEFAULT_ANNOUNCEMENT },
  };
}

function load() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_PATH)) {
    const fresh = defaultDb();
    persist(fresh);
    return fresh;
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    return { ...defaultDb(), ...parsed };
  } catch {
    const fresh = defaultDb();
    persist(fresh);
    return fresh;
  }
}

function persist(data) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const tmp = `${DB_PATH}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.copyFileSync(tmp, DB_PATH);
  fs.unlinkSync(tmp);
}

let db = load();

function save() {
  persist(db);
}

export function isMongoConnected() {
  return mongoose.connection.readyState === 1;
}

export async function seedMongoIfEmpty() {
  if (!isMongoConnected()) return;
  try {
    const itemCount = await ItemModel.countDocuments();
    if (itemCount === 0) {
      await ItemModel.insertMany(STARTER_ITEMS);
    }
    const fund = await GangFundModel.findOne({ id: 'main' });
    if (!fund) {
      await GangFundModel.create({
        id: 'main',
        baseAmount: 0,
        lastUpdated: nowIso(),
        updatedBy: 'system',
      });
    }
    const ann = await AnnouncementModel.findOne({ id: 'main' });
    if (!ann) {
      await AnnouncementModel.create({ ...DEFAULT_ANNOUNCEMENT });
    }
  } catch (err) {
    console.error('Error seeding MongoDB Atlas collections:', err);
  }
}

function fundSnapshotLocal() {
  const income = db.transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const expense = db.transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  return {
    id: db.gangFund.id || 'main',
    baseAmount: Number(db.gangFund.baseAmount || 0),
    totalAmount: Number(db.gangFund.baseAmount || 0) + income - expense,
    lastUpdated: db.gangFund.lastUpdated || nowIso(),
    updatedBy: db.gangFund.updatedBy || 'system',
  };
}

export const store = {
  makeId,
  nowIso,

  async getMembers() {
    if (isMongoConnected()) {
      return MemberModel.find({}).sort({ order: 1 }).lean();
    }
    return [...db.members].sort((a, b) => (a.order || 0) - (b.order || 0));
  },

  async addMember(input) {
    const member = {
      id: makeId('mem'),
      name: String(input.name || '').trim(),
      rank: input.rank || 'recruit',
      contribution: Number(input.contribution || 100),
      hasPaid: Boolean(input.hasPaid),
      joinDate: input.joinDate || nowIso(),
      order: Number(input.order ?? db.members.length),
    };
    if (isMongoConnected()) {
      const created = await MemberModel.create(member);
      return created.toObject();
    }
    db.members.push(member);
    save();
    return member;
  },

  async updateMember(id, updates) {
    if (isMongoConnected()) {
      return MemberModel.findOneAndUpdate({ id }, { $set: updates }, { new: true }).lean();
    }
    const member = db.members.find((m) => m.id === id);
    if (!member) return null;
    if (updates.name !== undefined) member.name = updates.name;
    if (updates.rank !== undefined) member.rank = updates.rank;
    if (updates.contribution !== undefined) member.contribution = Number(updates.contribution);
    if (updates.hasPaid !== undefined) member.hasPaid = Boolean(updates.hasPaid);
    if (updates.order !== undefined) member.order = Number(updates.order);
    if (updates.joinDate !== undefined) member.joinDate = updates.joinDate;
    save();
    return member;
  },

  async deleteMember(id) {
    if (isMongoConnected()) {
      const res = await MemberModel.deleteOne({ id });
      return res.deletedCount > 0;
    }
    const before = db.members.length;
    db.members = db.members.filter((m) => m.id !== id);
    save();
    return before !== db.members.length;
  },

  async getTransactions() {
    if (isMongoConnected()) {
      return TransactionModel.find({}).sort({ date: -1 }).lean();
    }
    return [...db.transactions].sort((a, b) => String(b.date).localeCompare(String(a.date)));
  },

  async addTransaction(input) {
    const tx = {
      id: makeId('tx'),
      description: String(input.description || '').trim(),
      amount: Number(input.amount || 0),
      date: input.date || nowIso(),
      type: input.type === 'income' ? 'income' : 'expense',
      category: input.category || 'other',
    };
    if (isMongoConnected()) {
      const created = await TransactionModel.create(tx);
      return created.toObject();
    }
    db.transactions.push(tx);
    save();
    return tx;
  },

  async deleteTransaction(id) {
    if (isMongoConnected()) {
      const res = await TransactionModel.deleteOne({ id });
      return res.deletedCount > 0;
    }
    const before = db.transactions.length;
    db.transactions = db.transactions.filter((t) => t.id !== id);
    save();
    return before !== db.transactions.length;
  },

  async getItems() {
    if (isMongoConnected()) {
      return ItemModel.find({}).sort({ name: 1 }).lean();
    }
    return [...db.items].sort((a, b) => a.name.localeCompare(b.name));
  },

  async addItem(input) {
    const item = {
      id: makeId('item'),
      name: String(input.name || '').trim(),
      price: Number(input.price || 0),
      category: input.category || 'gear',
      description: input.description || '',
    };
    if (isMongoConnected()) {
      const created = await ItemModel.create(item);
      return created.toObject();
    }
    db.items.push(item);
    save();
    return item;
  },

  async updateItem(id, updates) {
    if (isMongoConnected()) {
      return ItemModel.findOneAndUpdate({ id }, { $set: updates }, { new: true }).lean();
    }
    const item = db.items.find((i) => i.id === id);
    if (!item) return null;
    if (updates.name !== undefined) item.name = updates.name;
    if (updates.price !== undefined) item.price = Number(updates.price);
    if (updates.category !== undefined) item.category = updates.category;
    if (updates.description !== undefined) item.description = updates.description;
    save();
    return item;
  },

  async deleteItem(id) {
    if (isMongoConnected()) {
      const res = await ItemModel.deleteOne({ id });
      return res.deletedCount > 0;
    }
    const before = db.items.length;
    db.items = db.items.filter((i) => i.id !== id);
    save();
    return before !== db.items.length;
  },

  async getOrders() {
    if (isMongoConnected()) {
      return OrderModel.find({}).sort({ orderDate: -1 }).lean();
    }
    return [...db.orders].sort((a, b) => String(b.orderDate).localeCompare(String(a.orderDate)));
  },

  async addOrder(input) {
    const order = {
      id: makeId('ord'),
      memberId: input.memberId || '',
      memberName: String(input.memberName || '').trim(),
      items: Array.isArray(input.items) ? input.items : [],
      totalAmount: Number(input.totalAmount || 0),
      status: input.status || 'pending',
      category: input.category || 'gear',
      orderDate: input.orderDate || nowIso(),
    };
    if (isMongoConnected()) {
      const created = await OrderModel.create(order);
      return created.toObject();
    }
    db.orders.push(order);
    save();
    return order;
  },

  async updateOrder(id, updates) {
    if (isMongoConnected()) {
      return OrderModel.findOneAndUpdate({ id }, { $set: updates }, { new: true }).lean();
    }
    const order = db.orders.find((o) => o.id === id);
    if (!order) return null;
    if (updates.status !== undefined) order.status = updates.status;
    if (updates.totalAmount !== undefined) order.totalAmount = Number(updates.totalAmount);
    if (updates.items !== undefined) order.items = updates.items;
    if (updates.category !== undefined) order.category = updates.category;
    save();
    return order;
  },

  async deleteOrder(id) {
    if (isMongoConnected()) {
      const res = await OrderModel.deleteOne({ id });
      return res.deletedCount > 0;
    }
    const before = db.orders.length;
    db.orders = db.orders.filter((o) => o.id !== id);
    save();
    return before !== db.orders.length;
  },

  async getGangFund() {
    if (isMongoConnected()) {
      let fund = await GangFundModel.findOne({ id: 'main' }).lean();
      if (!fund) {
        fund = { id: 'main', baseAmount: 0, lastUpdated: nowIso(), updatedBy: 'system' };
      }
      const txs = await TransactionModel.find({}).lean();
      const income = txs.filter((t) => t.type === 'income').reduce((sum, t) => sum + Number(t.amount || 0), 0);
      const expense = txs.filter((t) => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount || 0), 0);
      return {
        id: 'main',
        baseAmount: Number(fund.baseAmount || 0),
        totalAmount: Number(fund.baseAmount || 0) + income - expense,
        lastUpdated: fund.lastUpdated || nowIso(),
        updatedBy: fund.updatedBy || 'system',
      };
    }
    return fundSnapshotLocal();
  },

  async updateGangFund(baseAmount, updatedBy) {
    if (isMongoConnected()) {
      await GangFundModel.findOneAndUpdate(
        { id: 'main' },
        { $set: { baseAmount: Number(baseAmount || 0), lastUpdated: nowIso(), updatedBy: updatedBy || 'admin' } },
        { upsert: true, new: true }
      );
      return this.getGangFund();
    }
    db.gangFund.baseAmount = Number(baseAmount || 0);
    db.gangFund.lastUpdated = nowIso();
    db.gangFund.updatedBy = updatedBy || 'admin';
    save();
    return fundSnapshotLocal();
  },

  async getAnnouncement() {
    if (isMongoConnected()) {
      const ann = await AnnouncementModel.findOne({ id: 'main' }).lean();
      if (ann) return { text: ann.text, updatedBy: ann.updatedBy, updatedAt: ann.updatedAt };
      return { ...DEFAULT_ANNOUNCEMENT };
    }
    return { ...db.announcement };
  },

  async updateAnnouncement(text, updatedBy) {
    const updated = {
      text: String(text || '').trim(),
      updatedBy: updatedBy || 'Leader',
      updatedAt: nowIso(),
    };
    if (isMongoConnected()) {
      await AnnouncementModel.findOneAndUpdate(
        { id: 'main' },
        { $set: updated },
        { upsert: true, new: true }
      );
      return updated;
    }
    db.announcement = updated;
    save();
    return { ...db.announcement };
  },

  async getWeeklyPaymentRecords() {
    if (isMongoConnected()) {
      return WeeklyRecordModel.find({}).sort({ weekNumber: -1 }).lean();
    }
    return [...db.weeklyPaymentRecords].sort((a, b) => (b.weekNumber || 0) - (a.weekNumber || 0));
  },

  async upsertWeeklyPaymentRecord(input) {
    const id = `rec_${input.memberId}_${input.weekNumber}`;
    const record = {
      id,
      memberId: input.memberId,
      memberName: input.memberName,
      weekStart: input.weekStart,
      weekEnd: input.weekEnd,
      weekNumber: Number(input.weekNumber),
      contribution: Number(input.contribution || 0),
      hasPaid: Boolean(input.hasPaid),
      paymentDate: input.paymentDate || (input.hasPaid ? nowIso() : undefined),
      markedBy: input.markedBy || 'admin',
      markedAt: input.markedAt || nowIso(),
      notes: input.notes || '',
    };
    if (isMongoConnected()) {
      await WeeklyRecordModel.findOneAndUpdate({ id }, { $set: record }, { upsert: true, new: true });
      return record;
    }
    const idx = db.weeklyPaymentRecords.findIndex((r) => r.id === id);
    if (idx >= 0) db.weeklyPaymentRecords[idx] = record;
    else db.weeklyPaymentRecords.push(record);
    save();
    return record;
  },

  async deleteWeeklyPaymentRecord(id) {
    if (isMongoConnected()) {
      const res = await WeeklyRecordModel.deleteOne({ id });
      return res.deletedCount > 0;
    }
    const before = db.weeklyPaymentRecords.length;
    db.weeklyPaymentRecords = db.weeklyPaymentRecords.filter((r) => r.id !== id);
    save();
    return before !== db.weeklyPaymentRecords.length;
  },

  async getStreams() {
    if (isMongoConnected()) {
      return StreamModel.find({}).sort({ createdAt: -1 }).lean();
    }
    return [...db.streams].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  },

  async addStream(input) {
    const stream = {
      id: makeId('stream'),
      memberName: String(input.memberName || '').trim(),
      platform: input.platform || 'kick',
      channelSlug: String(input.channelSlug || '').trim(),
      title: input.title || 'Live Stream',
      isLive: input.isLive !== false,
      addedBy: input.addedBy || 'Leader',
      createdAt: nowIso(),
    };
    if (isMongoConnected()) {
      const created = await StreamModel.create(stream);
      return created.toObject();
    }
    db.streams.push(stream);
    save();
    return stream;
  },

  async deleteStream(id) {
    if (isMongoConnected()) {
      const res = await StreamModel.deleteOne({ id });
      return res.deletedCount > 0;
    }
    const before = db.streams.length;
    db.streams = db.streams.filter((s) => s.id !== id);
    save();
    return before !== db.streams.length;
  },
};
