export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';
    const allowedOrigins = (env.ALLOWED_ORIGINS || '*').split(',').map(s => s.trim());

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(origin, allowedOrigins) });
    }

    try {
      if (url.pathname === '/api/gemini' && request.method === 'POST') {
        return handleGemini(request, env, origin, allowedOrigins);
      }
      if (url.pathname === '/api/ask' && request.method === 'POST') {
        return handleAsk(request, env, origin, allowedOrigins);
      }
      return new Response(JSON.stringify({ ok: true, name: 'vale-bot-worker' }), {
        headers: { 'content-type': 'application/json', ...corsHeaders(origin, allowedOrigins) }
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { 'content-type': 'application/json', ...corsHeaders(origin, allowedOrigins) }
      });
    }
  }
};

function corsHeaders(origin, allowedOrigins) {
  const allowAll = allowedOrigins.includes('*');
  const allowOrigin = allowAll || allowedOrigins.includes(origin) ? origin || '*' : 'null';
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

async function handleGemini(request, env, origin, allowedOrigins) {
  const { model = 'gemini-1.5-flash', prompt = '', temperature = 0.7, safetySettings } = await request.json();
  if (!env.GEMINI_API_KEY) {
    return json({ error: 'Missing GEMINI_API_KEY' }, 500, origin, allowedOrigins);
  }
  if (!prompt) {
    return json({ error: 'Falta prompt' }, 400, origin, allowedOrigins);
  }

  const payload = {
    contents: [{ parts: [{ text: prompt }]}],
    generationConfig: { temperature: Number(temperature) || 0.7 },
    safetySettings: safetySettings || [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_SEXUAL_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' }
    ]
  };

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(env.GEMINI_API_KEY)}`;
  const res = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) {
    return json({ error: 'Google API error', status: res.status, details: data }, res.status, origin, allowedOrigins);
  }
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return json({ text }, 200, origin, allowedOrigins);
}

function json(body, status = 200, origin, allowedOrigins) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...corsHeaders(origin, allowedOrigins) }
  });
}

// --- Simple RAG MVP ---
// Minimal store of site content fragments. Edit/add more as needed.
const FRAGMENTS = [
  {
    id: 'home-intro',
    tags: ['inicio','profe vale','sitio','microbit','apps'],
    text: 'Sitio de Profe Vale con apps web para micro:bit: control por flechas, reconocimiento facial, Teachable Machine, y más. Bluetooth Web, educación en español.'
  },
  {
    id: 'apps-flechas',
    tags: ['flechas','bluetooth','uart','microbit','control'],
    text: 'App Micro:bit Flechas: envía comandos U/D/L/R configurables por Bluetooth (UART Nordic). Ideal para controlar robots o juegos direccionales.'
  },
  {
    id: 'apps-rf',
    tags: ['reconocimiento facial','facial','tensorflow','mediapipe','parametros'],
    text: 'App Micro:bit RF: detección de rostro con TensorFlow.js y MediaPipe. Envía 12 parámetros: posición, rotación (yaw/pitch/roll), ojos, boca, sonrisa, visibilidad.'
  },
  {
    id: 'apps-tm',
    tags: ['teachable machine','modelo','clasificacion','camara'],
    text: 'App Micro:bit Teachable: carga modelos de Google Teachable Machine para clasificar en tiempo real y enviar la clase resultante a la micro:bit.'
  },
  {
    id: 'privacidad-image-trainer',
    tags: ['privacidad','imagen','modelo','local'],
    text: 'En Image Trainer las imágenes no se suben ni almacenan en servidores. Todo se procesa localmente en tu navegador. Podés exportar e importar el modelo.'
  },
  {
    id: 'requisitos-navegador',
    tags: ['chrome','edge','web bluetooth','permiso','camara'],
    text: 'Requisitos: usar Chrome/Edge. Para Bluetooth y cámara, otorgar permisos al navegador. No se necesita instalar apps.'
  }
];

function score(question, frag) {
  const q = question.toLowerCase();
  let s = 0;
  for (const t of frag.tags) {
    if (q.includes(t)) s += 2;
  }
  // simple word overlap
  for (const w of q.split(/[^a-záéíóúñ0-9]+/i)) {
    if (w && frag.text.toLowerCase().includes(w)) s += 1;
  }
  return s;
}

async function handleAsk(request, env, origin, allowedOrigins) {
  const { question = '' } = await request.json();
  if (!question) return json({ error: 'Falta pregunta' }, 400, origin, allowedOrigins);

  // retrieve top fragments
  const ranked = FRAGMENTS.map(f => ({ f, s: score(question, f) }))
    .sort((a,b) => b.s - a.s)
    .slice(0, 3)
    .filter(r => r.s > 0);

  if (ranked.length === 0) {
    // no context: respond with fallback message (no hallucinations)
    return json({
      answer: 'No tengo información suficiente en este sitio para responder. Probá reformular o consultá la sección Recursos.',
      sources: []
    }, 200, origin, allowedOrigins);
  }

  const context = ranked.map(r => `• (${r.f.id}) ${r.f.text}`).join('\n');
  const prompt = `Contestá en español de forma breve y clara usando SOLO el contexto a continuación. Si el contexto no alcanza, decí que no sabés.\n\nPregunta: ${question}\n\nContexto:\n${context}`;

  // call Gemini with constrained prompt
  const subReq = new Request('https://example.com', { method: 'POST', body: JSON.stringify({}) }); // placeholder
  const res = await handleGemini(new Request(request.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'gemini-1.5-flash', prompt, temperature: 0.2 })
  }), env, origin, allowedOrigins);
  const { text } = await res.json();

  return json({ answer: text, sources: ranked.map(r => r.f.id) }, 200, origin, allowedOrigins);
}
