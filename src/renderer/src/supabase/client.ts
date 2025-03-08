import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { Database } from './database.types'

export const createClient = () =>
  createSupabaseClient<Database>(
    'https://xszdgbmgwnaxbyekqons.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzemRnYm1nd25heGJ5ZWtxb25zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzgzODAxMDcsImV4cCI6MjA1Mzk1NjEwN30.S4fGG1sv9drG9f04ejWCpmeGyrLkRTdXnxq_UaZzlUg'
  )
