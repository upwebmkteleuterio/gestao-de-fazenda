import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zipoizwadfyatilohcon.supabase.co';
const supabasePublishableKey = 'sb_publishable_WwsF1dYAe_cLVN0S1d3fOg_JXmi3adz';

export const supabase = createClient(supabaseUrl, supabasePublishableKey);
