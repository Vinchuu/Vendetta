// Type definitions for FYB Gang System

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
  orderDate: string;
}

export interface GangFund {
  id: string;
  baseAmount: number;
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

const API_BASE = '/api';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const errorText = await res.text();
    let errorMessage = `HTTP Error ${res.status}`;
    try {
      const parsed = JSON.parse(errorText);
      if (parsed.error || parsed.message) errorMessage = parsed.error || parsed.message;
    } catch {
      if (errorText) errorMessage = errorText;
    }
    throw new Error(errorMessage);
  }

  return res.json();
}

export const apiService = {
  // Authentication
  getDiscordLoginUrl(mode: string): string {
    const isDev = typeof window !== 'undefined' && window.location.port === '8080';
    const baseUrl = isDev ? 'http://localhost:5000' : '';
    return `${baseUrl}/api/auth/discord/login?mode=${mode}`;
  },

  async login(mode: string, password?: string) {
    return fetchJson<{ success: boolean; mode: string; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ mode, password }),
    });
  },

  // Members
  async getMembers(): Promise<Member[]> {
    return fetchJson<Member[]>('/members');
  },

  async addMember(member: Omit<Member, 'id'>): Promise<Member> {
    return fetchJson<Member>('/members', {
      method: 'POST',
      body: JSON.stringify(member),
    });
  },

  async updateMember(id: string, updates: Partial<Member>): Promise<Member> {
    return fetchJson<Member>(`/members/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  async batchUpdateMembers(updates: { id: string; updates: Partial<Member> }[]): Promise<Member[]> {
    return fetchJson<Member[]>('/members/batch-update', {
      method: 'POST',
      body: JSON.stringify({ updates }),
    });
  },

  async deleteMember(id: string): Promise<void> {
    await fetchJson<{ success: boolean }>(`/members/${id}`, {
      method: 'DELETE',
    });
  },

  subscribeToMembers(callback: (members: Member[]) => void): () => void {
    return apiService.subscribeToEvent('members_updated', callback);
  },

  // Transactions
  async getTransactions(): Promise<Transaction[]> {
    return fetchJson<Transaction[]>('/transactions');
  },

  async addTransaction(transaction: Omit<Transaction, 'id'>): Promise<Transaction> {
    return fetchJson<Transaction>('/transactions', {
      method: 'POST',
      body: JSON.stringify(transaction),
    });
  },

  async deleteTransaction(id: string): Promise<void> {
    await fetchJson<{ success: boolean }>(`/transactions/${id}`, {
      method: 'DELETE',
    });
  },

  subscribeToTransactions(callback: (transactions: Transaction[]) => void): () => void {
    return apiService.subscribeToEvent('transactions_updated', callback);
  },

  // Items
  async getItems(): Promise<Item[]> {
    return fetchJson<Item[]>('/items');
  },

  async addItem(item: Omit<Item, 'id'>): Promise<Item> {
    return fetchJson<Item>('/items', {
      method: 'POST',
      body: JSON.stringify(item),
    });
  },

  async updateItem(id: string, updates: Partial<Item>): Promise<Item> {
    return fetchJson<Item>(`/items/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  async deleteItem(id: string): Promise<void> {
    await fetchJson<{ success: boolean }>(`/items/${id}`, {
      method: 'DELETE',
    });
  },

  subscribeToItems(callback: (items: Item[]) => void): () => void {
    return apiService.subscribeToEvent('items_updated', callback);
  },

  // Orders
  async getOrders(): Promise<Order[]> {
    return fetchJson<Order[]>('/orders');
  },

  async addOrder(order: Omit<Order, 'id'>): Promise<Order> {
    return fetchJson<Order>('/orders', {
      method: 'POST',
      body: JSON.stringify(order),
    });
  },

  async updateOrder(id: string, updates: Partial<Order>): Promise<Order> {
    return fetchJson<Order>(`/orders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  async deleteOrder(id: string): Promise<void> {
    await fetchJson<{ success: boolean }>(`/orders/${id}`, {
      method: 'DELETE',
    });
  },

  subscribeToOrders(callback: (orders: Order[]) => void): () => void {
    return apiService.subscribeToEvent('orders_updated', callback);
  },

  // Gang Fund
  async getGangFund(): Promise<GangFund | null> {
    return fetchJson<GangFund>('/gangfund');
  },

  async updateGangFund(baseAmount: number, updatedBy: string): Promise<GangFund> {
    return fetchJson<GangFund>('/gangfund', {
      method: 'PUT',
      body: JSON.stringify({ baseAmount, updatedBy }),
    });
  },

  subscribeToGangFund(callback: (fund: GangFund) => void): () => void {
    return apiService.subscribeToEvent('gangfund_updated', callback);
  },

  // Gang Announcement
  async getAnnouncement(): Promise<Announcement> {
    return fetchJson<Announcement>('/announcement');
  },

  async updateAnnouncement(text: string, updatedBy: string): Promise<Announcement> {
    return fetchJson<Announcement>('/announcement', {
      method: 'PUT',
      body: JSON.stringify({ text, updatedBy }),
    });
  },

  subscribeToAnnouncement(callback: (announcement: Announcement) => void): () => void {
    return apiService.subscribeToEvent('announcement_updated', callback);
  },

  // Weekly Payment Records & Audit Logs
  async getWeeklyPaymentRecords(): Promise<WeeklyPaymentRecord[]> {
    return fetchJson<WeeklyPaymentRecord[]>('/weekly-payment-records');
  },

  async upsertWeeklyPaymentRecord(record: Omit<WeeklyPaymentRecord, 'id'>): Promise<WeeklyPaymentRecord> {
    return fetchJson<WeeklyPaymentRecord>('/weekly-payment-records/upsert', {
      method: 'POST',
      body: JSON.stringify(record),
    });
  },

  async deleteWeeklyPaymentRecord(id: string): Promise<void> {
    await fetchJson<{ success: boolean }>(`/weekly-payment-records/${id}`, {
      method: 'DELETE',
    });
  },

  subscribeToWeeklyPaymentRecords(callback: (records: WeeklyPaymentRecord[]) => void): () => void {
    return apiService.subscribeToEvent('weekly_payments_updated', callback);
  },

  async getAuditLogs(): Promise<AuditLog[]> {
    return fetchJson<AuditLog[]>('/audit-logs');
  },

  async addAuditLog(auditLog: Omit<AuditLog, 'id'>): Promise<AuditLog> {
    return fetchJson<AuditLog>('/audit-logs', {
      method: 'POST',
      body: JSON.stringify(auditLog),
    });
  },

  subscribeToAuditLogs(callback: (logs: AuditLog[]) => void): () => void {
    return apiService.subscribeToEvent('audit_logs_updated', callback);
  },

  // Live Streams
  async getStreams(): Promise<StreamChannel[]> {
    return fetchJson<StreamChannel[]>('/streams');
  },

  async addStream(stream: Omit<StreamChannel, 'id' | 'createdAt'>): Promise<StreamChannel> {
    return fetchJson<StreamChannel>('/streams', {
      method: 'POST',
      body: JSON.stringify(stream),
    });
  },

  async deleteStream(id: string): Promise<void> {
    await fetchJson<{ success: boolean }>(`/streams/${id}`, {
      method: 'DELETE',
    });
  },

  subscribeToStreams(callback: (streams: StreamChannel[]) => void): () => void {
    return apiService.subscribeToEvent('streams_updated', callback);
  },

  // Real-Time SSE Subscription Helper
  subscribeToEvent<T>(eventType: string, callback: (data: T) => void): () => void {
    if (typeof window === 'undefined') return () => {};

    const eventSource = new EventSource('/api/events');
    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === eventType && payload.data !== undefined && payload.data !== null) {
          // Prevent SSE reconnects from wiping out existing state with empty array broadcast
          if (Array.isArray(payload.data) && payload.data.length === 0) {
            return;
          }
          callback(payload.data);
        }
      } catch (err) {
        console.error('Failed to parse SSE event payload:', err);
      }
    };

    eventSource.onerror = (err) => {
      // EventSource will automatically attempt to reconnect
    };

    return () => {
      eventSource.close();
    };
  },

  // Export URLs
  getExportCsvUrl(type: 'transactions' | 'auditlogs'): string {
    return `${API_BASE}/export/csv?type=${type}`;
  }
};
