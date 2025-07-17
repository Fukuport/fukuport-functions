import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // ← security definer に必要
)

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const bubbleUserId = req.headers['bubble-user-id']
  const { delta } = req.body

  if (!bubbleUserId || typeof delta !== 'number') {
    return res.status(400).json({ error: 'Invalid input' })
  }

  // ① Bubble ID → Supabaseのuser_id に変換
  const { data: userRecord, error: userError } = await supabase
    .from('Users')
    .select('user_id')
    .eq('bubble_user_id', bubbleUserId)
    .single()

  if (userError || !userRecord) {
    console.error('ユーザー変換エラー:', userError?.message)
    return res.status(404).json({ error: 'User not found' })
  }

  const supabaseUserId = userRecord.user_id

  // ② 現在のポイントを取得
  const { data, error: fetchError } = await supabase
    .from('PointWallets')
    .select('total_points')
    .eq('user_id', supabaseUserId)
    .single()

  if (fetchError || !data) {
    console.error('ポイント取得エラー:', fetchError?.message)
    return res.status(404).json({ error: 'User wallet not found' })
  }

  const currentPoints = data.total_points

  // ③ マイナス制限
  if (currentPoints + delta < 0) {
    return res.status(400).json({ error: 'Not enough points' })
  }

  // ④ ポイント更新（RPC関数）
  const { error: updateError } = await supabase.rpc('adjust_points', {
    uid: supabaseUserId,
    delta_val: delta,
  })

  if (updateError) {
    console.error('ポイント更新エラー:', updateError.message)
    return res.status(500).json({ error: updateError.message })
  }

  // ✅ Bubbleで条件分岐させるために status を含める
  res.status(200).json({ status: 200, message: 'Points updated successfully' })
}
