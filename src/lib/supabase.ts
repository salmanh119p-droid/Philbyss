import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://cvrdxkwrteuhlxzdryab.supabase.co';

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2cmR4a3dydGV1aGx4emRyeWFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwMzQ3NDMsImV4cCI6MjA4NzYxMDc0M30.gIyzC-2wk2jce6vKzVVykP9O4oMxlXUXV-zkB5PQIzg';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
