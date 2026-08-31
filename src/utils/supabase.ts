import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://lyncsdadhhkaxogokbpr.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_QklPi2e9OgOfKXzrOMrQEA_spm4ShTV';

export const supabase = createClient(supabaseUrl, supabaseKey);
