const PRODUCTION_WEBHOOK_URL = 'https://espadana.app.n8n.cloud/webhook/espadana-contact';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  const webhookUrl = process.env.BOOKING_WEBHOOK_URL || PRODUCTION_WEBHOOK_URL;

  try {
    const upstream = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    const text = await upstream.text();
    return res.status(upstream.ok ? 200 : 502).send(text);
  } catch (err) {
    return res.status(502).json({ ok: false, error: err.message });
  }
}
