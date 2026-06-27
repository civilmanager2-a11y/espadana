/**
 * Cloudflare Worker — WebSocket Proxy for ElevenLabs
 * Proxies wss://api.elevenlabs.io through Cloudflare
 * so Iranian users can connect without VPN.
 */

const ELEVENLABS_HOST = 'api.elevenlabs.io';

export default {
  async fetch(request) {
    const upgradeHeader = request.headers.get('Upgrade');

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': '*',
        },
      });
    }

    // Must be a WebSocket upgrade
    if (!upgradeHeader || upgradeHeader.toLowerCase() !== 'websocket') {
      return new Response('این سرویس فقط WebSocket می‌پذیرد.', { status: 426 });
    }

    const url = new URL(request.url);
    const targetUrl = `wss://${ELEVENLABS_HOST}${url.pathname}${url.search}`;

    // Forward headers (especially Sec-WebSocket-Protocol for ElevenLabs)
    const forwardHeaders = {};
    const proto = request.headers.get('Sec-WebSocket-Protocol');
    if (proto) forwardHeaders['Sec-WebSocket-Protocol'] = proto;

    // Connect to ElevenLabs upstream
    let upstreamResponse;
    try {
      upstreamResponse = await fetch(targetUrl, {
        headers: {
          'Upgrade': 'websocket',
          'Connection': 'Upgrade',
          ...forwardHeaders,
        },
      });
    } catch (err) {
      return new Response('خطا در اتصال به ElevenLabs: ' + err.message, { status: 502 });
    }

    if (upstreamResponse.status !== 101) {
      return new Response('ElevenLabs اتصال را رد کرد: ' + upstreamResponse.status, { status: 502 });
    }

    const upstreamWs = upstreamResponse.webSocket;

    // Create client-facing WebSocket pair
    const { 0: clientWs, 1: serverWs } = new WebSocketPair();

    upstreamWs.accept();
    serverWs.accept();

    // Client → ElevenLabs
    serverWs.addEventListener('message', ({ data }) => {
      try { upstreamWs.send(data); } catch (_) {}
    });
    serverWs.addEventListener('close', ({ code, reason }) => {
      try { upstreamWs.close(code, reason); } catch (_) {}
    });
    serverWs.addEventListener('error', () => {
      try { upstreamWs.close(1011, 'client error'); } catch (_) {}
    });

    // ElevenLabs → Client
    upstreamWs.addEventListener('message', ({ data }) => {
      try { serverWs.send(data); } catch (_) {}
    });
    upstreamWs.addEventListener('close', ({ code, reason }) => {
      try { serverWs.close(code, reason); } catch (_) {}
    });
    upstreamWs.addEventListener('error', () => {
      try { serverWs.close(1011, 'upstream error'); } catch (_) {}
    });

    return new Response(null, {
      status: 101,
      webSocket: clientWs,
      headers: {
        'Access-Control-Allow-Origin': '*',
        ...(proto ? { 'Sec-WebSocket-Protocol': proto } : {}),
      },
    });
  },
};
