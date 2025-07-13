// /api/get-user-points.ts

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const user_id = req.query.user_id

  if (!user_id) {
    return res.status(400).json({ error: 'Missing user_id' })
  }

  const { data, error } = await supabase
    .from('PointWallets')
    .select('total_points')
    .eq('user_id', user_id)
    .single()

  if (error) {
    console.error('Fetch error:', error.message)
    return res.status(500).json({ error: 'Failed to fetch points' })
  }

  res.status(200).json({ total_points: data.total_points })
}
