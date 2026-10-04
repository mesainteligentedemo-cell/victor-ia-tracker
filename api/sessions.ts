export default async function handler(req, res) {
  if (req.method === 'GET') {
    return res.status(200).json({ status: 'OK', message: 'Tracker API ready' })
  }

  if (req.method === 'POST') {
    try {
      console.log('Session received:', req.body)
      return res.status(201).json({ 
        success: true, 
        session_id: 'test-' + Date.now(),
        message: 'Session registered'
      })
    } catch (err) {
      return res.status(500).json({ error: err.message })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
