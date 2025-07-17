import { createClient } from '@supabase/supabase-js'
import { Configuration, OpenAIApi } from 'openai'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY
})
const openai = new OpenAIApi(configuration)

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const bubbleUserId = req.headers['bubble-user-id']
  const { delta, prompt } = req.body // delta はマイナスの整数（例: -1）

  if (!bubbleUserId || typeof delta !== 'number' || !prompt) {
    return res.status(400).json({ error: 'Invalid input' })
  }

  // ① Supabase user_id 取得
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

  if (currentPoints + delta < 0) {
    return res.status(400).json({ error: 'Not enough points' })
  }

  // ③ 画像生成実行（先に）
  let imageUrl = ''
  try {
    const response = await openai.createImage({
      prompt,
      n: 1,
      size: '512x512'
    })
    imageUrl = response.data.data[0].url
  } catch (e) {
    console.error('画像生成エラー:', e)
    return res.status(500).json({ error: 'Image generation failed' })
  }

  // ④ 成功した場合のみポイントを減算（RPC）
  const { error: updateError } = await supabase.rpc('adjust_points', {
    uid: supabaseUserId,
    delta_val: delta
  })

  if (updateError) {
    console.error('ポイント更新エラー:', updateError.message)
    return res.status(500).json({ error: updateError.message })
  }

  // ✅ 最終レスポンス
  return res.status(200).json({ status: 200, imageUrl })
}
