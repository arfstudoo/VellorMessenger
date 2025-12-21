
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://sbwntawxidzsavfcoqlt.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNid250YXd4aWR6c2F2ZmNvcWx0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4OTI1NjQsImV4cCI6MjA4MTQ2ODU2NH0.st_QS0TqNb48hmaJl9858_OUjZg60yRPIPBZw5iM8Ys';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
