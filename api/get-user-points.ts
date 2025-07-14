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

  const bubbleUserId = req.headers['bubble-user-id']

  if (!bubbleUserId) {
    return res.status(400).json({ error: 'Missing bubble-user-id header' })
  }

  // Bubble ID → Supabase UUID へ変換
  const { data: userRecord, error: userError } = await supabase
    .from('Users')
    .select('id')
    .eq('bubble_user_id', bubbleUserId)
    .single()

  if (userError || !userRecord) {
    return res.status(404).json({ error: 'User not found' })
  }

  // UUID を使ってポイント取得（RLSが適用されるならここは公開キーで呼ぶ構成でもOK）
  const { data: wallet, error: walletError } = await supabase
    .from('PointWallets')
    .select('total_points')
    .eq('user_id', userRecord.id)
    .single()

  if (walletError || !wallet) {
    return res.status(500).json({ error: 'Failed to fetch points' })
  }

  return res.status(200).json({ total_points: wallet.total_points })
}
