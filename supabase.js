import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
const SUPABASE_URL = 'https://kpyhtvymgfsrrhijyyjs.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_JqL9hbARL6g-0cS3BjaCoQ_DhTBJ3YB';
export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
