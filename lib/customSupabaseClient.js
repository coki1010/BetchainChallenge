import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mldpmsflcjnzmrbvxjws.supabase.co'; // <- Ovo je tvoj URL iz Supabase
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sZHBtc2ZsY2puem1yYnZ4andzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzNzY2ODEsImV4cCI6MjA2Njk1MjY4MX0.rjyS8SaXyKDQObtF9WaEgzKWysADJSvTH3xRCZrUAWs'; // <- Ovdje zalijepi cijeli "anon" public API key

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
