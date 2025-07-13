import { createClient } from '@supabase/supabase-js'

console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY)

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

  // ① 現在のポイントを取得
  const { data, error: fetchError } = await supabase
    .from('PointWallets')
    .select('total_points')
    .eq('user_id', user_id)
    .single()

  // ✅ ポイントレコードが存在しないケースへの対応（←これを追加！）
  if (fetchError || !data) {
    console.error('ポイント取得エラー（walletが存在しない可能性あり）:', fetchError?.message)
    return res.status(404).json({ error: 'User wallet not found' })
  }

  const currentPoints = data.total_points

  // ② マイナスになるのを防止
  if (currentPoints + delta < 0) {
    return res.status(400).json({ error: 'Not enough points' })
  }

  // ③ ポイント更新（RPC呼び出し）
  const { error: updateError } = await supabase.rpc('adjust_points', {
    uid: user_id,
    delta_val: delta
  })

  if (updateError) {
    console.error('ポイント更新エラー:', updateError.message)
    return res.status(500).json({ error: updateError.message })
  }

  // ④ 完了レスポンス
  res.status(200).json({ message: 'Points updated successfully' })
}
