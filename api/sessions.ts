import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = req.headers.authorization?.substring(7);
  if (token !== process.env.TRACKER_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { data, error } = await supabase
      .from('tracker_sessions')
      .insert([req.body])
      .select('id, session_id');

    if (error) throw error;

    return res.status(201).json({
      success: true,
      session_id: req.body.session_id,
      tracker_id: data[0].id
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
