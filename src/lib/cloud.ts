import type { User } from '@supabase/supabase-js'
import { exportBackup, importBackup, type Backup } from '@/lib/db'
import { supabase } from '@/lib/supabase'

interface CloudBackupRow {
  payload: Backup
  updated_at: string
}

function client() {
  if (!supabase) throw new Error('Supabase no está configurado')
  return supabase
}

export async function saveCloudBackup(user: User): Promise<string> {
  const payload = await exportBackup()
  const updatedAt = new Date().toISOString()
  const { error } = await client().from('user_backups').upsert({
    user_id: user.id,
    payload,
    updated_at: updatedAt,
  })
  if (error) throw error
  return updatedAt
}

export async function getCloudBackup(): Promise<CloudBackupRow | null> {
  const { data, error } = await client()
    .from('user_backups')
    .select('payload, updated_at')
    .maybeSingle()
  if (error) throw error
  return data as CloudBackupRow | null
}

export async function restoreCloudBackup(): Promise<string> {
  const remote = await getCloudBackup()
  if (!remote) throw new Error('Todavía no hay una copia guardada en esta cuenta')
  await importBackup(remote.payload)
  return remote.updated_at
}
