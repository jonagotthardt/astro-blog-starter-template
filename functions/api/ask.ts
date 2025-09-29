// functions/api/ask.ts
import { Ai } from '@cloudflare/ai';

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

    // Binding-Name exakt so wie in Cloudflare Pages → Workers AI: SMP_AI
    const ai = new Ai((env as any).SMP_AI);

    // Stabiles, frei verfügbares Modell wählen
    const model = '@cf/meta/llama-3.1-8b-instruct';

    const result: any = await ai.run(model, {
      messages: [
        { role: 'system', content: 'You are the helpful AI for the CommunitySMP Minecraft server. Be concise and friendly.' },
        { role: 'user', content: text }
      ]
    });

    const reply =
      result?.response ??
      result?.output_text ??
      (typeof result === 'string' ? result : 'Sorry, no reply.');

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
