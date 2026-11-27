// Registro de aceptaciones de profevale.com.ar
// POST /api/aceptacion  -> guarda una fila por documento aceptado (fecha, hora, IP, versión)
// GET  /api/aceptaciones.csv con encabezado "Authorization: Bearer <EXPORT_TOKEN>" -> descarga todo en CSV
const DOCS = ['terminos', 'privacidad', 'cookies', 'reembolso'];

function cors(req, env) {
  const origin = req.headers.get('Origin') || '';
  const ok = (env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).includes(origin);
  return ok ? { 'Access-Control-Allow-Origin': origin, 'Vary': 'Origin' } : {};
}
const corto = (v, n) => (typeof v === 'string' ? v.slice(0, n) : null);

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const h = cors(req, env);
    if (req.method === 'OPTIONS') return new Response(null, { headers: { ...h, 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'Content-Type' } });

    if (url.pathname === '/api/aceptacion' && req.method === 'POST') {
      if (!h['Access-Control-Allow-Origin']) return new Response('origen no permitido', { status: 403 });
      let d;
      try { d = JSON.parse(await req.text()); } catch { return new Response('json inválido', { status: 400, headers: h }); }
      const docs = d && typeof d.documentos === 'object' ? d.documentos : {};
      const ahora = new Date().toISOString();
      const ip = req.headers.get('CF-Connecting-IP');
      const pais = req.cf && req.cf.country || null;
      const ua = corto(req.headers.get('User-Agent'), 300);
      const filas = Object.keys(docs).filter(k => DOCS.includes(k)).map(k =>
        env.DB.prepare('INSERT INTO aceptaciones (id,fecha_hora_utc,ip,pais,origen,documento,version,decision,pagina,fecha_cliente,user_agent) VALUES (?,?,?,?,?,?,?,?,?,?,?)')
          .bind(crypto.randomUUID(), ahora, ip, pais, corto(d.origen, 60) || 'desconocido', k, corto(docs[k], 60) || '', corto(d.decision, 60), corto(d.pagina, 200), corto(d.fecha_cliente, 40), ua));
      if (!filas.length) return new Response('sin documentos', { status: 400, headers: h });
      await env.DB.batch(filas);
      return new Response('ok', { headers: h });
    }

    if (url.pathname === '/api/aceptaciones.csv' && req.method === 'GET') {
      const auth = req.headers.get('Authorization') || '';
      if (!env.EXPORT_TOKEN || auth !== 'Bearer ' + env.EXPORT_TOKEN) return new Response('no autorizado', { status: 401 });
      const { results } = await env.DB.prepare('SELECT * FROM aceptaciones ORDER BY fecha_hora_utc').all();
      const cols = ['id','fecha_hora_utc','ip','pais','origen','documento','version','decision','pagina','fecha_cliente','user_agent'];
      const esc = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
      const csv = [cols.join(',')].concat(results.map(r => cols.map(c => esc(r[c])).join(','))).join('\n');
      return new Response(csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="aceptaciones.csv"' } });
    }
    return new Response('no encontrado', { status: 404 });
  }
};
