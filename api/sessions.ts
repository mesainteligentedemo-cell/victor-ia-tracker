import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return res.status(200).json({ status: 'OK' })
  }

  if (req.method === 'POST') {
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      )

      const { data, error } = await supabase
        .from('tracker_sessions')
        .insert([req.body])

      if (error) return res.status(400).json({ error: error.message })
      return res.status(201).json({ success: true, data })
    } catch (err) {
      return res.status(500).json({ error: err.message })
    }
  }
}
