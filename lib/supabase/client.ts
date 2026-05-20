import { createBrowserClient } from '@supabase/ssr'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://svcaqqojjowzuivqplho.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN2Y2FxcW9qam93enVpdnFwbGhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyODI0OTIsImV4cCI6MjA5NDg1ODQ5Mn0.L59aTp1jbF1Q8YsOJzYL4BobJSqE8QSH7I-n5a3WJO0'

export function createClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)
}
