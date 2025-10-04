# Vale Bot Worker (MVP)

Proxy seguro para Google AI Studio (Gemini) y endpoint RAG básico restringido al contenido del sitio.

## Endpoints
- POST /api/gemini: { model, prompt, temperature } → { text }
- POST /api/ask: { question } → { answer, sources[] }

## Deploy (Cloudflare Workers)
1. Requisitos: tener cuenta de Cloudflare y Wrangler instalado
2. Configurar variables de entorno:

```sh
# desde la carpeta workers/valebot
wrangler secret put GEMINI_API_KEY
```

3. Configurar orígenes permitidos (CORS):

```toml
# wrangler.toml
ALLOWED_ORIGINS = "https://tu-dominio.com,https://valebod.github.io"
```

4. Publicar:

```sh
wrangler deploy
```

5. Copiar la URL del Worker (por ejemplo, https://vale-bot-worker.tuuser.workers.dev) y usar:
- En AIStudio: proxy https://vale-bot-worker.tuuser.workers.dev/api/gemini
- En Chat IA: se tomará ese valor desde localStorage (se convierte a /api/ask automáticamente)

## Notas de seguridad
- La API key jamás se expone al cliente.
- CORS restringido a tus dominios.
- Se recomienda añadir rate-limit (Cloudflare Rules) si hay uso público.
