import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { user_id, delta } = req.body

  if (!user_id || typeof delta !== 'number') {
    return res.status(400).json({ error: 'Invalid input' })
  }

  const { error } = await supabase.rpc('adjust_points', {
    uid: user_id,
    delta_val: delta
  })

  if (error) return res.status(500).json({ error: error.message })

  res.status(200).json({ message: 'Points updated successfully' })
}
