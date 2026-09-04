import mongoose from 'mongoose';

const MemberSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  rank: { type: String, default: 'recruit' },
  contribution: { type: Number, default: 100 },
  hasPaid: { type: Boolean, default: false },
  joinDate: { type: String, default: () => new Date().toISOString() },
  order: { type: Number, default: 0 },
}, { timestamps: true });

const TransactionSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  description: { type: String, required: true },
  amount: { type: Number, required: true },
  type: { type: String, enum: ['income', 'expense'], required: true },
  category: { type: String, default: 'operation' },
  date: { type: String, default: () => new Date().toISOString() },
}, { timestamps: true });

const ItemSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  category: { type: String, default: 'gear' },
  description: { type: String, default: '' },
}, { timestamps: true });

const OrderSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  memberId: { type: String, default: '' },
  memberName: { type: String, required: true },
  items: [{
    itemId: String,
    itemName: String,
    quantity: Number,
    price: Number,
  }],
  totalAmount: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'approved', 'completed', 'cancelled'], default: 'pending' },
  category: { type: String, default: 'gear' },
  orderDate: { type: String, default: () => new Date().toISOString() },
}, { timestamps: true });

const StreamSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  memberName: { type: String, required: true },
  platform: { type: String, enum: ['kick', 'youtube', 'twitch'], required: true },
  channelSlug: { type: String, required: true },
  title: { type: String, default: '' },
  isLive: { type: Boolean, default: true },
  addedBy: { type: String, default: 'system' },
  createdAt: { type: String, default: () => new Date().toISOString() },
}, { timestamps: true });

const WeeklyRecordSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  memberId: { type: String, required: true },
  memberName: { type: String, required: true },
  weekStart: { type: String, required: true },
  weekEnd: { type: String, required: true },
  weekNumber: { type: Number, required: true },
  contribution: { type: Number, required: true },
  hasPaid: { type: Boolean, default: false },
  paymentDate: { type: String },
  markedBy: { type: String, default: 'Leader' },
  markedAt: { type: String, default: () => new Date().toISOString() },
  notes: { type: String, default: '' },
}, { timestamps: true });

const GangFundSchema = new mongoose.Schema({
  id: { type: String, default: 'main', unique: true },
  baseAmount: { type: Number, default: 0 },
  lastUpdated: { type: String, default: () => new Date().toISOString() },
  updatedBy: { type: String, default: 'system' },
}, { timestamps: true });

const AnnouncementSchema = new mongoose.Schema({
  id: { type: String, default: 'main', unique: true },
  text: { type: String, required: true },
  updatedBy: { type: String, default: 'Tatya Vinchu' },
  updatedAt: { type: String, default: () => new Date().toISOString() },
}, { timestamps: true });

export const MemberModel = mongoose.models.Member || mongoose.model('Member', MemberSchema);
export const TransactionModel = mongoose.models.Transaction || mongoose.model('Transaction', TransactionSchema);
export const ItemModel = mongoose.models.Item || mongoose.model('Item', ItemSchema);
export const OrderModel = mongoose.models.Order || mongoose.model('Order', OrderSchema);
export const StreamModel = mongoose.models.Stream || mongoose.model('Stream', StreamSchema);
export const WeeklyRecordModel = mongoose.models.WeeklyRecord || mongoose.model('WeeklyRecord', WeeklyRecordSchema);
export const GangFundModel = mongoose.models.GangFund || mongoose.model('GangFund', GangFundSchema);
export const AnnouncementModel = mongoose.models.Announcement || mongoose.model('Announcement', AnnouncementSchema);
