/**
 * Cloudflare Worker — Full Proxy for ElevenLabs (HTTP + WebSocket)
 * Handles both REST config fetches and WebSocket voice connections
 * so Iranian users can use the chatbot without VPN.
 *
 * Also handles POST /api/contact — forwards form submissions to the n8n
 * webhook. Set BOOKING_WEBHOOK_URL in .dev.vars (local) or Worker env vars
 * (staging) to override; the production URL is the hardcoded fallback so no
 * env var is needed in production.
 */

const PRODUCTION_WEBHOOK_URL = 'https://espadana.app.n8n.cloud/webhook/espadana-contact';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': '*',
};

// Map proxy host patterns to ElevenLabs hosts
function getTargetHost(url) {
  // Support both api.elevenlabs.io and api.us.elevenlabs.io
  const path = url.pathname;
  if (path.includes('/us/') || url.searchParams.get('region') === 'us') {
    return 'api.us.elevenlabs.io';
  }
  return 'api.us.elevenlabs.io'; // default to us region (what the widget uses)
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    // ── Contact form → n8n webhook ────────────────────────────────────
    if (url.pathname === '/api/contact' && request.method === 'POST') {
      const webhookUrl = (env && env.BOOKING_WEBHOOK_URL) || PRODUCTION_WEBHOOK_URL;
      let body;
      try {
        body = await request.json();
      } catch {
        return new Response(JSON.stringify({ ok: false, error: 'Invalid JSON' }), {
          status: 400,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }
      try {
        const upstream = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const text = await upstream.text();
        return new Response(text, {
          status: upstream.ok ? 200 : 502,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      } catch (err) {
        return new Response(JSON.stringify({ ok: false, error: err.message }), {
          status: 502,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }
    }

    const upgradeHeader = request.headers.get('Upgrade');

    // ── WebSocket proxy ──────────────────────────────────────────────
    if (upgradeHeader && upgradeHeader.toLowerCase() === 'websocket') {
      const targetHost = getTargetHost(url);
      const targetUrl = `wss://${targetHost}${url.pathname}${url.search}`;
      const proto = request.headers.get('Sec-WebSocket-Protocol');

      let upstreamResponse;
      try {
        upstreamResponse = await fetch(targetUrl, {
          headers: {
            'Upgrade': 'websocket',
            'Connection': 'Upgrade',
            ...(proto ? { 'Sec-WebSocket-Protocol': proto } : {}),
          },
        });
      } catch (err) {
        return new Response('WS upstream error: ' + err.message, { status: 502 });
      }

      if (upstreamResponse.status !== 101) {
        return new Response('WS upstream rejected: ' + upstreamResponse.status, { status: 502 });
      }

      const upstreamWs = upstreamResponse.webSocket;
      const { 0: clientWs, 1: serverWs } = new WebSocketPair();
      upstreamWs.accept();
      serverWs.accept();

      serverWs.addEventListener('message', ({ data }) => { try { upstreamWs.send(data); } catch (_) {} });
      serverWs.addEventListener('close', ({ code, reason }) => { try { upstreamWs.close(code, reason); } catch (_) {} });
      upstreamWs.addEventListener('message', ({ data }) => { try { serverWs.send(data); } catch (_) {} });
      upstreamWs.addEventListener('close', ({ code, reason }) => { try { serverWs.close(code, reason); } catch (_) {} });

      return new Response(null, {
        status: 101,
        webSocket: clientWs,
        headers: {
          ...CORS_HEADERS,
          ...(proto ? { 'Sec-WebSocket-Protocol': proto } : {}),
        },
      });
    }

    // ── HTTP/REST proxy ──────────────────────────────────────────────
    const targetHost = getTargetHost(url);
    const targetUrl = `https://${targetHost}${url.pathname}${url.search}`;

    const headers = new Headers(request.headers);
    headers.set('host', targetHost);
    headers.delete('cf-connecting-ip');
    headers.delete('cf-ipcountry');
    headers.delete('cf-ray');
    headers.delete('cf-visitor');

    let upstreamResponse;
    try {
      upstreamResponse = await fetch(targetUrl, {
        method: request.method,
        headers,
        body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
      });
    } catch (err) {
      return new Response('HTTP upstream error: ' + err.message, { status: 502 });
    }

    const responseHeaders = new Headers(upstreamResponse.headers);
    Object.entries(CORS_HEADERS).forEach(([k, v]) => responseHeaders.set(k, v));

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: responseHeaders,
    });
  },
};
