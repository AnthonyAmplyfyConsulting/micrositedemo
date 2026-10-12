import 'server-only'
import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

/**
 * Server-side Supabase client using the service-role key.
 * Only import this from API routes / server code. `server-only` makes the build
 * fail if it is ever pulled into a client component, which would leak the key.
 */
export function createServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase is not configured (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).')
  }
  return createClient<Database>(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
