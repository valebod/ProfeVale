// Configuración global del sitio (editar una sola vez)
// Estudiantes NO deben tocar nada. Completá estas URLs vos y listo.

window.PROFE_VALE_CONFIG = {
  // URL del proxy Gemini (termina en /api/gemini)
  GEMINI_PROXY_URL: 'https://vale-bot-worker.tuuser.workers.dev/api/gemini',

  // URL del endpoint de chat RAG (opcional). Si lo dejás vacío, se deriva de GEMINI_PROXY_URL cambiando /api/gemini -> /api/ask
  RAG_ASK_URL: ''
};

// Páginas legales y registro de aceptaciones (ver legal/ y workers/consentimientos)
window.PV_LEGAL_CONFIG = {
  // URL del Worker de consentimientos, termina en /api/aceptacion. Vacío = no se registra todavía.
  REGISTRO_URL: '',
  // Correo al que llegan los pedidos de arrepentimiento (falta confirmar con Vale)
  CORREO_CONTACTO: ''
};
