CREATE TABLE IF NOT EXISTS aceptaciones (
  id TEXT PRIMARY KEY,
  fecha_hora_utc TEXT NOT NULL,        -- fecha y hora del servidor (UTC)
  ip TEXT,                             -- IP que ve Cloudflare (CF-Connecting-IP)
  pais TEXT,                           -- país estimado por Cloudflare
  origen TEXT NOT NULL,                -- formulario o banner (preinscripcion, formacion, banner-cookies, arrepentimiento)
  documento TEXT NOT NULL,             -- terminos, privacidad, cookies, reembolso
  version TEXT NOT NULL,               -- versión del documento aceptado
  decision TEXT,                       -- aceptado/rechazado (cookies) o código de trámite
  pagina TEXT,
  fecha_cliente TEXT,                  -- fecha que informó el navegador (referencia)
  user_agent TEXT
);
CREATE INDEX IF NOT EXISTS idx_fecha ON aceptaciones(fecha_hora_utc);
