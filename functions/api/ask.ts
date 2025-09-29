// functions/api/ask.ts
import { Ai } from '@cloudflare/ai';

// functions/api/ask.ts
// REST-API Version (kein Workers-AI-Binding nötig)
export const onRequestPost: PagesFunction = async ({ request, env }) => {
  try {
    const { prompt } = await request.json();
    const text = (prompt ?? '').toString().slice(0, 4000);

    if (!text) {
      return new Response(JSON.stringify({ error: 'Missing prompt' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // ❗ Deine Cloudflare Account-ID (aus deinem Screenshot)
    const ACCOUNT_ID = 'a69f4e57793af296948719260515fe76';

    // Stabiles Modell wählen (verfügbar in allen Accounts)
    const MODEL = '@cf/meta/llama-3.1-8b-instruct';

    // Dein API-Token kommt als ENV-Variable (nie im Code hardcoden!)
    const token = "AqPQ0K_VG-QjAnB8x6uW1f_k6KEngqgXQQIVZCT5";
    if (!token) {
      return new Response(JSON.stringify({ error: 'Missing CF_API_TOKEN env' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const url = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/ai/run/${encodeURIComponent(MODEL)}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: 'You are the helpful AI for the CommunitySMP Minecraft server. Be concise and friendly.' },
          { role: 'user', content: text },
        ],
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      // Fehler der CF-API nach vorn reichen, damit du es im Frontend siehst
      const msg = data?.errors?.[0]?.message || data?.error || `HTTP ${res.status}`;
      return new Response(JSON.stringify({ error: msg }), {
        status: res.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const reply =
      data?.result?.response ??
      data?.result?.output_text ??
      (typeof data?.result === 'string' ? data.result : 'No reply');

    return new Response(JSON.stringify({ reply }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};