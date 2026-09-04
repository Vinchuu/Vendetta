import { io, Socket } from 'socket.io-client';

export interface Member {
  id: string;
  name: string;
  rank?: string;
  contribution: number;
  hasPaid: boolean;
  joinDate: string;
  order: number;
}

export interface Announcement {
  text: string;
  updatedBy: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  date: string;
  type: 'income' | 'expense';
  category: string;
}

export interface Item {
  id: string;
  name: string;
  price: number;
  category: string;
  description?: string;
}

export interface Order {
  id: string;
  memberId: string;
  memberName: string;
  items: {
    itemId: string;
    itemName: string;
    quantity: number;
    price: number;
  }[];
  totalAmount: number;
  status: 'pending' | 'approved' | 'completed' | 'cancelled';
  category?: string;
  orderDate: string;
}

export interface GangFund {
  id: string;
  baseAmount: number;
  totalAmount?: number;
  lastUpdated: string;
  updatedBy: string;
}

export interface AuditLog {
  id: string;
  weekStart: string;
  weekEnd: string;
  weekNumber: number;
  memberId: string;
  memberName: string;
  hasPaid: boolean;
  contribution: number;
  paymentDate?: string;
  createdAt: string;
}

export interface WeeklyPaymentRecord {
  id: string;
  memberId: string;
  memberName: string;
  weekStart: string;
  weekEnd: string;
  weekNumber: number;
  contribution: number;
  hasPaid: boolean;
  paymentDate?: string;
  markedBy: string;
  markedAt: string;
  notes?: string;
}

export interface StreamChannel {
  id: string;
  memberName: string;
  platform: 'kick' | 'youtube' | 'twitch';
  channelSlug: string;
  title?: string;
  isLive?: boolean;
  addedBy: string;
  createdAt: string;
}

const DEFAULT_ANNOUNCEMENT: Announcement = {
  text: '🔥 VENDETTA GANG ORDERS: Welcome to paradise. Pay weekly dues & prepare for Syndicate meeting!',
  updatedBy: 'Tatya Vinchu',
  updatedAt: new Date().toISOString(),
};

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

function apiUrl(path: string) {
  return `${API_BASE}${path}`;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(apiUrl(path), {
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    ...init,
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.message) message = body.message;
      else if (body?.error) message = body.error;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

let socket: Socket | null = null;

function getSocket(): Socket {
  if (!socket) {
    socket = io(API_BASE || undefined, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
}

function subscribe<T>(event: string, callback: (payload: T) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const s = getSocket();
  const handler = (payload: T) => callback(payload);
  s.on(event, handler);
  return () => {
    s.off(event, handler);
  };
}

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export const apiService = {
  getDiscordLoginUrl(mode: string): string {
    const clientId = import.meta.env.VITE_DISCORD_CLIENT_ID || '1543516731354382438';
    const redirectUri =
      import.meta.env.VITE_DISCORD_REDIRECT_URI ||
      (typeof window !== 'undefined' ? `${window.location.origin}/` : 'http://localhost:8080/');

    return `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=identify&state=${mode}`;
  },

  async login(mode: string, password?: string) {
    try {
      return await request<{ success: boolean; mode: string; token: string; message?: string }>(
        '/api/auth/login',
        { method: 'POST', body: JSON.stringify({ mode, password }) }
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid credentials! Access Denied.';
      return { success: false, mode, token: '', message };
    }
  },

  async verifyDiscordUser(discordId: string, username: string, targetMode: string) {
    try {
      return await request<{ success: boolean; mode: string; token: string; username?: string; message?: string }>(
        '/api/auth/discord/verify',
        { method: 'POST', body: JSON.stringify({ discordId, username, targetMode }) }
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Discord authorization failed';
      return { success: false, mode: 'viewer2', token: '', message };
    }
  },

  async getMembers(): Promise<Member[]> {
    return request<Member[]>('/api/members');
  },

  async addMember(member: Omit<Member, 'id'>): Promise<Member> {
    return request<Member>('/api/members', { method: 'POST', body: JSON.stringify(member) });
  },

  async updateMember(id: string, updates: Partial<Member>): Promise<Member> {
    return request<Member>(`/api/members/${id}`, { method: 'PATCH', body: JSON.stringify(updates) });
  },

  async batchUpdateMembers(updates: { id: string; updates: Partial<Member> }[]): Promise<Member[]> {
    for (const item of updates) {
      await apiService.updateMember(item.id, item.updates);
    }
    return apiService.getMembers();
  },

  async deleteMember(id: string): Promise<void> {
    await request(`/api/members/${id}`, { method: 'DELETE' });
  },

  subscribeToMembers(callback: (members: Member[]) => void): () => void {
    return subscribe<Member[]>('members', callback);
  },

  async getTransactions(): Promise<Transaction[]> {
    return request<Transaction[]>('/api/transactions');
  },

  async addTransaction(transaction: Omit<Transaction, 'id'>): Promise<Transaction> {
    return request<Transaction>('/api/transactions', { method: 'POST', body: JSON.stringify(transaction) });
  },

  async deleteTransaction(id: string): Promise<void> {
    await request(`/api/transactions/${id}`, { method: 'DELETE' });
  },

  subscribeToTransactions(callback: (transactions: Transaction[]) => void): () => void {
    return subscribe<Transaction[]>('transactions', callback);
  },

  async getItems(): Promise<Item[]> {
    return request<Item[]>('/api/items');
  },

  async addItem(item: Omit<Item, 'id'>): Promise<Item> {
    return request<Item>('/api/items', { method: 'POST', body: JSON.stringify(item) });
  },

  async updateItem(id: string, updates: Partial<Item>): Promise<Item> {
    return request<Item>(`/api/items/${id}`, { method: 'PATCH', body: JSON.stringify(updates) });
  },

  async deleteItem(id: string): Promise<void> {
    await request(`/api/items/${id}`, { method: 'DELETE' });
  },

  subscribeToItems(callback: (items: Item[]) => void): () => void {
    return subscribe<Item[]>('items', callback);
  },

  async getOrders(): Promise<Order[]> {
    return request<Order[]>('/api/orders');
  },

  async addOrder(order: Omit<Order, 'id'>): Promise<Order> {
    return request<Order>('/api/orders', { method: 'POST', body: JSON.stringify(order) });
  },

  async updateOrder(id: string, updates: Partial<Order>): Promise<Order> {
    return request<Order>(`/api/orders/${id}`, { method: 'PATCH', body: JSON.stringify(updates) });
  },

  async deleteOrder(id: string): Promise<void> {
    await request(`/api/orders/${id}`, { method: 'DELETE' });
  },

  subscribeToOrders(callback: (orders: Order[]) => void): () => void {
    return subscribe<Order[]>('orders', callback);
  },

  async getGangFund(): Promise<GangFund | null> {
    return request<GangFund>('/api/gangfund');
  },

  async updateGangFund(baseAmount: number, updatedBy: string): Promise<GangFund> {
    return request<GangFund>('/api/gangfund', {
      method: 'PUT',
      body: JSON.stringify({ baseAmount, updatedBy }),
    });
  },

  subscribeToGangFund(callback: (fund: GangFund) => void): () => void {
    return subscribe<GangFund>('gangfund', callback);
  },

  async getAnnouncement(): Promise<Announcement> {
    try {
      return await request<Announcement>('/api/announcement');
    } catch {
      return DEFAULT_ANNOUNCEMENT;
    }
  },

  async updateAnnouncement(text: string, updatedBy: string): Promise<Announcement> {
    return request<Announcement>('/api/announcement', {
      method: 'PUT',
      body: JSON.stringify({ text, updatedBy }),
    });
  },

  subscribeToAnnouncement(callback: (announcement: Announcement) => void): () => void {
    return subscribe<Announcement>('announcement', callback);
  },

  async getWeeklyPaymentRecords(): Promise<WeeklyPaymentRecord[]> {
    return request<WeeklyPaymentRecord[]>('/api/weekly-payment-records');
  },

  async upsertWeeklyPaymentRecord(record: Omit<WeeklyPaymentRecord, 'id'>): Promise<WeeklyPaymentRecord> {
    return request<WeeklyPaymentRecord>('/api/weekly-payment-records', {
      method: 'PUT',
      body: JSON.stringify(record),
    });
  },

  async deleteWeeklyPaymentRecord(id: string): Promise<void> {
    await request(`/api/weekly-payment-records/${id}`, { method: 'DELETE' });
  },

  subscribeToWeeklyPaymentRecords(callback: (records: WeeklyPaymentRecord[]) => void): () => void {
    return subscribe<WeeklyPaymentRecord[]>('weekly_payment_records', callback);
  },

  async getAuditLogs(): Promise<AuditLog[]> {
    const records = await apiService.getWeeklyPaymentRecords();
    return records.map((r) => ({
      id: r.id,
      weekStart: r.weekStart,
      weekEnd: r.weekEnd,
      weekNumber: r.weekNumber,
      memberId: r.memberId,
      memberName: r.memberName,
      hasPaid: r.hasPaid,
      contribution: r.contribution,
      paymentDate: r.paymentDate,
      createdAt: r.markedAt,
    }));
  },

  async addAuditLog(auditLog: Omit<AuditLog, 'id'>): Promise<AuditLog> {
    const rec = await apiService.upsertWeeklyPaymentRecord({
      memberId: auditLog.memberId,
      memberName: auditLog.memberName,
      weekStart: auditLog.weekStart,
      weekEnd: auditLog.weekEnd,
      weekNumber: auditLog.weekNumber,
      contribution: auditLog.contribution,
      hasPaid: auditLog.hasPaid,
      paymentDate: auditLog.paymentDate,
      markedBy: 'admin',
      markedAt: auditLog.createdAt,
    });
    return {
      id: rec.id,
      weekStart: rec.weekStart,
      weekEnd: rec.weekEnd,
      weekNumber: rec.weekNumber,
      memberId: rec.memberId,
      memberName: rec.memberName,
      hasPaid: rec.hasPaid,
      contribution: rec.contribution,
      paymentDate: rec.paymentDate,
      createdAt: rec.markedAt,
    };
  },

  subscribeToAuditLogs(callback: (logs: AuditLog[]) => void): () => void {
    return apiService.subscribeToWeeklyPaymentRecords((records) => {
      callback(records.map((r) => ({
        id: r.id,
        weekStart: r.weekStart,
        weekEnd: r.weekEnd,
        weekNumber: r.weekNumber,
        memberId: r.memberId,
        memberName: r.memberName,
        hasPaid: r.hasPaid,
        contribution: r.contribution,
        paymentDate: r.paymentDate,
        createdAt: r.markedAt,
      })));
    });
  },

  async getStreams(): Promise<StreamChannel[]> {
    return request<StreamChannel[]>('/api/streams');
  },

  async addStream(stream: Omit<StreamChannel, 'id' | 'createdAt'>): Promise<StreamChannel> {
    return request<StreamChannel>('/api/streams', { method: 'POST', body: JSON.stringify(stream) });
  },

  async deleteStream(id: string): Promise<void> {
    await request(`/api/streams/${id}`, { method: 'DELETE' });
  },

  subscribeToStreams(callback: (streams: StreamChannel[]) => void): () => void {
    return subscribe<StreamChannel[]>('streams', callback);
  },

  async downloadTransactionsCsv(): Promise<void> {
    const txs = await apiService.getTransactions();
    let csv = 'ID,Date,Description,Category,Type,Amount\n';
    txs.forEach((t) => {
      csv += `"${t.id}","${t.date}","${(t.description || '').replace(/"/g, '""')}","${t.category}","${t.type}",${t.amount}\n`;
    });
    downloadCsv('money_moves_report.csv', csv);
  },

  async downloadAuditLogsCsv(): Promise<void> {
    const records = await apiService.getWeeklyPaymentRecords();
    let csv = 'ID,Member,WeekNumber,Contribution,HasPaid,MarkedBy,MarkedAt,Notes\n';
    records.forEach((r) => {
      csv += `"${r.id}","${r.memberName}",${r.weekNumber},${r.contribution},${r.hasPaid ? 'YES' : 'NO'},"${r.markedBy}","${r.markedAt}","${(r.notes || '').replace(/"/g, '""')}"\n`;
    });
    downloadCsv('weekly_audit_report.csv', csv);
  },

  getExportCsvUrl(type: 'transactions' | 'auditlogs'): string {
    return `#export-${type}`;
  },
};
