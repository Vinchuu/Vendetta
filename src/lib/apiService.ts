// Type definitions and Database Services for Vendetta Gang System
import { supabase, isSupabaseConfigured } from './supabase';

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

// In-memory fallback / announcement storage
const DEFAULT_ANNOUNCEMENT: Announcement = {
  text: "🔥 VENDETTA GANG ORDERS: Welcome to paradise. Pay weekly dues & prepare for Syndicate meeting!",
  updatedBy: "Tatya Vinchu",
  updatedAt: new Date().toISOString()
};

export const apiService = {
  // Authentication
  getDiscordLoginUrl(mode: string): string {
    const clientId = '1543516731354382438';
    const redirectUri = typeof window !== 'undefined'
      ? `${window.location.origin}/`
      : 'http://localhost:5173/';

    return `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=identify&state=${mode}`;
  },

  async login(mode: string, password?: string) {
    const adminPassword = "YK789";
    const gangMemberPassword = "takla";

    if (
      (mode === "admin" && password === adminPassword) ||
      (mode === "gangmember" && password === gangMemberPassword)
    ) {
      return {
        success: true,
        mode,
        token: `fyb_token_${mode}_${Date.now()}`
      };
    }

    return {
      success: false,
      mode,
      token: "",
      message: "Invalid credentials! Access Denied."
    };
  },

  // Members
  async getMembers(): Promise<Member[]> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('members').select('*').order('order', { ascending: true });
      if (!error && data) {
        return data.map(m => ({
          id: m.id,
          name: m.name,
          rank: m.rank,
          contribution: Number(m.contribution || 0),
          hasPaid: Boolean(m.has_paid),
          joinDate: m.join_date || m.created_at,
          order: m.order || 0
        }));
      }
    }
    return [];
  },

  async addMember(member: Omit<Member, 'id'>): Promise<Member> {
    const id = `mem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const joinDate = member.joinDate || new Date().toISOString();
    
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('members').insert({
        id,
        name: member.name,
        rank: member.rank || 'recruit',
        contribution: member.contribution || 100,
        has_paid: Boolean(member.hasPaid),
        join_date: joinDate,
        order: member.order || 1
      }).select().single();

      if (error) throw new Error(error.message);
      if (data) {
        return {
          id: data.id,
          name: data.name,
          rank: data.rank,
          contribution: Number(data.contribution),
          hasPaid: Boolean(data.has_paid),
          joinDate: data.join_date,
          order: data.order
        };
      }
    }

    return { id, ...member, joinDate };
  },

  async updateMember(id: string, updates: Partial<Member>): Promise<Member> {
    if (isSupabaseConfigured) {
      const dbUpdates: Record<string, any> = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.rank !== undefined) dbUpdates.rank = updates.rank;
      if (updates.contribution !== undefined) dbUpdates.contribution = updates.contribution;
      if (updates.hasPaid !== undefined) dbUpdates.has_paid = updates.hasPaid;
      if (updates.order !== undefined) dbUpdates.order = updates.order;
      if (updates.joinDate !== undefined) dbUpdates.join_date = updates.joinDate;

      const { data, error } = await supabase.from('members').update(dbUpdates).eq('id', id).select().single();
      if (error) throw new Error(error.message);
      if (data) {
        return {
          id: data.id,
          name: data.name,
          rank: data.rank,
          contribution: Number(data.contribution),
          hasPaid: Boolean(data.has_paid),
          joinDate: data.join_date,
          order: data.order
        };
      }
    }
    return { id, name: updates.name || '', contribution: updates.contribution || 0, hasPaid: Boolean(updates.hasPaid), joinDate: '', order: 0, ...updates };
  },

  async batchUpdateMembers(updates: { id: string; updates: Partial<Member> }[]): Promise<Member[]> {
    for (const item of updates) {
      await apiService.updateMember(item.id, item.updates);
    }
    return apiService.getMembers();
  },

  async deleteMember(id: string): Promise<void> {
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('members').delete().eq('id', id);
      if (error) throw new Error(error.message);
    }
  },

  subscribeToMembers(callback: (members: Member[]) => void): () => void {
    if (!isSupabaseConfigured || typeof window === 'undefined') return () => {};
    const channel = supabase.channel('members_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'members' }, async () => {
        const members = await apiService.getMembers();
        callback(members);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  // Transactions
  async getTransactions(): Promise<Transaction[]> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('transactions').select('*').order('date', { ascending: false });
      if (!error && data) {
        return data.map(t => ({
          id: t.id,
          description: t.description,
          amount: Number(t.amount || 0),
          date: t.date,
          type: t.type as 'income' | 'expense',
          category: t.category
        }));
      }
    }
    return [];
  },

  async addTransaction(transaction: Omit<Transaction, 'id'>): Promise<Transaction> {
    const id = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const date = transaction.date || new Date().toISOString();

    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('transactions').insert({
        id,
        description: transaction.description,
        amount: transaction.amount,
        type: transaction.type,
        category: transaction.category,
        date
      }).select().single();

      if (error) throw new Error(error.message);
      if (data) {
        return {
          id: data.id,
          description: data.description,
          amount: Number(data.amount),
          type: data.type,
          category: data.category,
          date: data.date
        };
      }
    }

    return { id, ...transaction, date };
  },

  async deleteTransaction(id: string): Promise<void> {
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (error) throw new Error(error.message);
    }
  },

  subscribeToTransactions(callback: (transactions: Transaction[]) => void): () => void {
    if (!isSupabaseConfigured || typeof window === 'undefined') return () => {};
    const channel = supabase.channel('transactions_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, async () => {
        const txs = await apiService.getTransactions();
        callback(txs);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  // Items
  async getItems(): Promise<Item[]> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('items').select('*').order('name', { ascending: true });
      if (!error && data) {
        return data.map(i => ({
          id: i.id,
          name: i.name,
          price: Number(i.price || 0),
          category: i.category,
          description: i.description
        }));
      }
    }
    return [];
  },

  async addItem(item: Omit<Item, 'id'>): Promise<Item> {
    const id = `item_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('items').insert({
        id,
        name: item.name,
        price: item.price,
        category: item.category,
        description: item.description
      }).select().single();

      if (error) throw new Error(error.message);
      if (data) {
        return {
          id: data.id,
          name: data.name,
          price: Number(data.price),
          category: data.category,
          description: data.description
        };
      }
    }
    return { id, ...item };
  },

  async updateItem(id: string, updates: Partial<Item>): Promise<Item> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('items').update(updates).eq('id', id).select().single();
      if (error) throw new Error(error.message);
      if (data) {
        return {
          id: data.id,
          name: data.name,
          price: Number(data.price),
          category: data.category,
          description: data.description
        };
      }
    }
    return { id, name: '', price: 0, category: '', ...updates };
  },

  async deleteItem(id: string): Promise<void> {
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('items').delete().eq('id', id);
      if (error) throw new Error(error.message);
    }
  },

  subscribeToItems(callback: (items: Item[]) => void): () => void {
    if (!isSupabaseConfigured || typeof window === 'undefined') return () => {};
    const channel = supabase.channel('items_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'items' }, async () => {
        const items = await apiService.getItems();
        callback(items);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  // Orders
  async getOrders(): Promise<Order[]> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('orders').select('*').order('order_date', { ascending: false });
      if (!error && data) {
        return data.map(o => ({
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
    }
    return [];
  },

  async addOrder(order: Omit<Order, 'id'>): Promise<Order> {
    const id = `ord_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const orderDate = order.orderDate || new Date().toISOString();

    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('orders').insert({
        id,
        member_id: order.memberId,
        member_name: order.memberName,
        items: order.items,
        total_amount: order.totalAmount,
        status: order.status || 'pending',
        category: order.category || 'arsenal',
        order_date: orderDate
      }).select().single();

      if (error) throw new Error(error.message);
      if (data) {
        return {
          id: data.id,
          memberId: data.member_id,
          memberName: data.member_name,
          items: data.items,
          totalAmount: Number(data.total_amount),
          status: data.status,
          category: data.category,
          orderDate: data.order_date
        };
      }
    }

    return { id, ...order, orderDate };
  },

  async updateOrder(id: string, updates: Partial<Order>): Promise<Order> {
    if (isSupabaseConfigured) {
      const dbUpdates: Record<string, any> = {};
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.totalAmount !== undefined) dbUpdates.total_amount = updates.totalAmount;
      if (updates.items !== undefined) dbUpdates.items = updates.items;
      if (updates.category !== undefined) dbUpdates.category = updates.category;

      const { data, error } = await supabase.from('orders').update(dbUpdates).eq('id', id).select().single();
      if (error) throw new Error(error.message);
      if (data) {
        // If order marked completed, auto-deposit to Gang Fund and create Income Transaction
        if (updates.status === 'completed') {
          const isSyndicate = data.category === 'syndicate';
          const categoryLabel = isSyndicate ? 'Syndicate Deal' : 'Arsenal Order';
          const categoryKey = isSyndicate ? 'syndicate_deal' : 'arsenal_order';

          await apiService.addTransaction({
            description: `${categoryLabel} Income: ${data.member_name}`,
            amount: Number(data.total_amount),
            type: 'income',
            category: categoryKey,
            date: new Date().toISOString()
          }).catch(console.error);

          const currentFund = await apiService.getGangFund();
          const currentBase = currentFund?.baseAmount || 0;
          await apiService.updateGangFund(currentBase + Number(data.total_amount), `${categoryLabel}: ${data.member_name}`).catch(console.error);
        }

        return {
          id: data.id,
          memberId: data.member_id,
          memberName: data.member_name,
          items: data.items,
          totalAmount: Number(data.total_amount),
          status: data.status,
          category: data.category,
          orderDate: data.order_date
        };
      }
    }
    return { id, memberId: '', memberName: '', items: [], totalAmount: 0, status: 'pending', orderDate: '', ...updates };
  },

  async deleteOrder(id: string): Promise<void> {
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('orders').delete().eq('id', id);
      if (error) throw new Error(error.message);
    }
  },

  subscribeToOrders(callback: (orders: Order[]) => void): () => void {
    if (!isSupabaseConfigured || typeof window === 'undefined') return () => {};
    const channel = supabase.channel('orders_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, async () => {
        const orders = await apiService.getOrders();
        callback(orders);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  // Gang Fund
  async getGangFund(): Promise<GangFund | null> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('gangfund').select('*').limit(1).single();
      if (!error && data) {
        return {
          id: data.id,
          baseAmount: Number(data.base_amount || 0),
          lastUpdated: data.last_updated,
          updatedBy: data.updated_by
        };
      }
    }
    return {
      id: "main",
      baseAmount: 20000,
      lastUpdated: new Date().toISOString(),
      updatedBy: "system"
    };
  },

  async updateGangFund(baseAmount: number, updatedBy: string): Promise<GangFund> {
    const lastUpdated = new Date().toISOString();
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('gangfund').upsert({
        id: "main",
        base_amount: Number(baseAmount),
        last_updated: lastUpdated,
        updated_by: updatedBy || "admin"
      }).select().single();

      if (error) throw new Error(error.message);
      if (data) {
        return {
          id: data.id,
          baseAmount: Number(data.base_amount),
          lastUpdated: data.last_updated,
          updatedBy: data.updated_by
        };
      }
    }
    return { id: "main", baseAmount, lastUpdated, updatedBy };
  },

  subscribeToGangFund(callback: (fund: GangFund) => void): () => void {
    if (!isSupabaseConfigured || typeof window === 'undefined') return () => {};
    const channel = supabase.channel('gangfund_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gangfund' }, async () => {
        const fund = await apiService.getGangFund();
        if (fund) callback(fund);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  // Gang Announcement
  async getAnnouncement(): Promise<Announcement> {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('vendetta_announcement');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {}
      }
    }
    return DEFAULT_ANNOUNCEMENT;
  },

  async updateAnnouncement(text: string, updatedBy: string): Promise<Announcement> {
    const updated: Announcement = {
      text,
      updatedBy: updatedBy || "Leader",
      updatedAt: new Date().toISOString()
    };
    if (typeof window !== 'undefined') {
      localStorage.setItem('vendetta_announcement', JSON.stringify(updated));
    }
    return updated;
  },

  subscribeToAnnouncement(callback: (announcement: Announcement) => void): () => void {
    if (typeof window !== 'undefined') {
      const handler = () => {
        apiService.getAnnouncement().then(callback);
      };
      window.addEventListener('storage', handler);
      return () => window.removeEventListener('storage', handler);
    }
    return () => {};
  },

  // Weekly Payment Records
  async getWeeklyPaymentRecords(): Promise<WeeklyPaymentRecord[]> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('weekly_payment_records').select('*').order('week_number', { ascending: false });
      if (!error && data) {
        return data.map(r => ({
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
    }
    return [];
  },

  async upsertWeeklyPaymentRecord(record: Omit<WeeklyPaymentRecord, 'id'>): Promise<WeeklyPaymentRecord> {
    const id = `rec_${record.memberId}_${record.weekNumber}`;
    const markedAt = new Date().toISOString();

    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('weekly_payment_records').upsert({
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
      }).select().single();

      if (error) throw new Error(error.message);
      if (data) {
        return {
          id: data.id,
          memberId: data.member_id,
          memberName: data.member_name,
          weekStart: data.week_start,
          weekEnd: data.week_end,
          weekNumber: Number(data.week_number),
          contribution: Number(data.contribution),
          hasPaid: Boolean(data.has_paid),
          paymentDate: data.payment_date,
          markedBy: data.marked_by,
          markedAt: data.marked_at,
          notes: data.notes
        };
      }
    }

    return { id, ...record, markedAt };
  },

  async deleteWeeklyPaymentRecord(id: string): Promise<void> {
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('weekly_payment_records').delete().eq('id', id);
      if (error) throw new Error(error.message);
    }
  },

  subscribeToWeeklyPaymentRecords(callback: (records: WeeklyPaymentRecord[]) => void): () => void {
    if (!isSupabaseConfigured || typeof window === 'undefined') return () => {};
    const channel = supabase.channel('weekly_records_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'weekly_payment_records' }, async () => {
        const records = await apiService.getWeeklyPaymentRecords();
        callback(records);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  async getAuditLogs(): Promise<AuditLog[]> {
    const records = await apiService.getWeeklyPaymentRecords();
    return records.map(r => ({
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
      markedAt: auditLog.createdAt
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
      createdAt: rec.markedAt
    };
  },

  subscribeToAuditLogs(callback: (logs: AuditLog[]) => void): () => void {
    return apiService.subscribeToWeeklyPaymentRecords(records => {
      callback(records.map(r => ({
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
      })));
    });
  },

  // Live Streams
  async getStreams(): Promise<StreamChannel[]> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('streams').select('*').order('created_at', { ascending: false });
      if (!error && data) {
        return data.map(s => ({
          id: s.id,
          memberName: s.member_name,
          platform: s.platform as 'kick' | 'youtube' | 'twitch',
          channelSlug: s.channel_slug,
          title: s.title,
          isLive: Boolean(s.is_live),
          addedBy: s.added_by,
          createdAt: s.created_at
        }));
      }
    }
    return [];
  },

  async addStream(stream: Omit<StreamChannel, 'id' | 'createdAt'>): Promise<StreamChannel> {
    const id = `stream_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const createdAt = new Date().toISOString();

    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('streams').insert({
        id,
        member_name: stream.memberName,
        platform: stream.platform,
        channel_slug: stream.channelSlug,
        title: stream.title || 'Live Stream',
        is_live: stream.isLive !== false,
        added_by: stream.addedBy || 'Member'
      }).select().single();

      if (error) throw new Error(error.message);
      if (data) {
        return {
          id: data.id,
          memberName: data.member_name,
          platform: data.platform,
          channelSlug: data.channel_slug,
          title: data.title,
          isLive: Boolean(data.is_live),
          addedBy: data.added_by,
          createdAt: data.created_at
        };
      }
    }

    return { id, ...stream, createdAt };
  },

  async deleteStream(id: string): Promise<void> {
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('streams').delete().eq('id', id);
      if (error) throw new Error(error.message);
    }
  },

  subscribeToStreams(callback: (streams: StreamChannel[]) => void): () => void {
    if (!isSupabaseConfigured || typeof window === 'undefined') return () => {};
    const channel = supabase.channel('streams_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'streams' }, async () => {
        const streams = await apiService.getStreams();
        callback(streams);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  // Export CSV Helper
  getExportCsvUrl(type: 'transactions' | 'auditlogs'): string {
    return `/api/export/csv?type=${type}`;
  }
};
