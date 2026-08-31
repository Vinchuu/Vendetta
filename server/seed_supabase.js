import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lyncsdadhhkaxogokbpr.supabase.co';
const supabaseKey = 'sb_publishable_QklPi2e9OgOfKXzrOMrQEA_spm4ShTV';

const supabase = createClient(supabaseUrl, supabaseKey);

const initialData = {
  members: [
    {
      id: "mem_1",
      name: "Tatya Vinchu",
      rank: "leader",
      contribution: 500,
      has_paid: true,
      join_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      order: 1
    },
    {
      id: "mem_2",
      name: "Baba Niranjana",
      rank: "underboss",
      contribution: 300,
      has_paid: true,
      join_date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
      order: 2
    },
    {
      id: "mem_3",
      name: "Chhota Rajan",
      rank: "enforcer",
      contribution: 200,
      has_paid: false,
      join_date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      order: 3
    }
  ],
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
    },
    {
      id: "tx_3",
      description: "Syndicate Arsenal Sale Income",
      amount: 3500,
      date: new Date().toISOString(),
      type: "income",
      category: "syndicate_deal"
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
      member_id: "mem_1",
      member_name: "Tatya Vinchu",
      items: [
        { itemId: "item_1", itemName: "AK-47", quantity: 1, price: 2500 },
        { itemId: "item_2", itemName: "Bulletproof Vest", quantity: 1, price: 800 }
      ],
      total_amount: 3300,
      status: "approved",
      category: "arsenal",
      order_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
    }
  ],
  gangfund: [
    {
      id: "main",
      base_amount: 20000,
      last_updated: new Date().toISOString(),
      updated_by: "system"
    }
  ],
  streams: [
    {
      id: "stream_1",
      member_name: "Tatya Vinchu",
      platform: "kick",
      channel_slug: "vendetta",
      title: "🔴 VENDETTA LEADER | SoulCity GTA RP Patrol",
      is_live: true,
      added_by: "Leader"
    },
    {
      id: "stream_2",
      member_name: "Baba Niranjana",
      platform: "youtube",
      channel_slug: "dQw4w9WgXcQ",
      title: "🗡️ SYNDICATE HEIST & PATROL",
      is_live: true,
      added_by: "Underboss"
    }
  ],
  weekly_payment_records: [
    {
      id: "rec_1",
      member_id: "mem_1",
      member_name: "Tatya Vinchu",
      week_start: "2026-08-25",
      week_end: "2026-08-31",
      week_number: 35,
      contribution: 500,
      has_paid: true,
      payment_date: "2026-08-28",
      marked_by: "admin",
      notes: "Paid in full via Bank Transfer"
    },
    {
      id: "rec_2",
      member_id: "mem_2",
      member_name: "Baba Niranjana",
      week_start: "2026-08-25",
      week_end: "2026-08-31",
      week_number: 35,
      contribution: 300,
      has_paid: true,
      payment_date: "2026-08-29",
      marked_by: "admin",
      notes: "Cash collection"
    }
  ]
};

async function seedDatabase() {
  console.log('--- SEEDING SUPABASE DATABASE WITH DUMMY DATA ---');

  for (const [table, rows] of Object.entries(initialData)) {
    console.log(`Seeding table '${table}' with ${rows.length} rows...`);
    const { data, error } = await supabase.from(table).upsert(rows).select();
    if (error) {
      console.error(`Error inserting into ${table}:`, error);
    } else {
      console.log(`Successfully seeded '${table}'. Inserted: ${data?.length} rows`);
    }
  }

  console.log('\n--- VERIFYING DATA IN SUPABASE ---');
  for (const table of Object.keys(initialData)) {
    const { data, error } = await supabase.from(table).select('*');
    if (error) {
      console.error(`Error fetching ${table}:`, error);
    } else {
      console.log(`Table '${table}' verified. Current count: ${data?.length}`);
    }
  }
}

seedDatabase().catch(console.error);
