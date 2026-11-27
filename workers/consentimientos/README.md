# Registro de aceptaciones (profevale.com.ar)

Guarda cada aceptación de Términos, Privacidad, Cookies y Reembolso con fecha y hora (UTC, del servidor), IP, país, versión del documento y desde qué formulario se aceptó. Los datos quedan en una base Cloudflare D1 (plan gratis) de la cuenta de Vale.

## Publicar (una sola vez)
```sh
cd workers/consentimientos
npx wrangler login
npx wrangler d1 create profevale-consentimientos   # copiar el database_id a wrangler.toml
npx wrangler d1 execute profevale-consentimientos --remote --file=schema.sql
npx wrangler secret put EXPORT_TOKEN                 # una clave larga, para descargar el registro
npx wrangler deploy
```
Después, en `site-config.js`, poner en `PV_LEGAL_CONFIG.REGISTRO_URL` la URL del Worker terminada en `/api/aceptacion`.

## Ver el registro
- En el panel de Cloudflare: Workers & Pages > D1 > profevale-consentimientos > tabla `aceptaciones`.
- O descargar en CSV:
```sh
curl -H "Authorization: Bearer TU_EXPORT_TOKEN" https://profevale-consentimientos.<tu-usuario>.workers.dev/api/aceptaciones.csv -o aceptaciones.csv
```

## Ojo
- Google Forms y Hotmart tienen sus propios registros: Google guarda la fecha de cada respuesta (no la IP), y Hotmart guarda la aceptación de sus términos en cada compra.
- La IP es un dato personal: está informado en la Política de Privacidad.
