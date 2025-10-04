// Simple client for Vale Bot using the Cloudflare Worker /api/ask
(function(){
  function addMessage(text, isUser = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = isUser ? 'user-message' : 'bot-message';
    if (isUser) {
      messageDiv.innerHTML = `<span class="message-label user-label">Tú:</span><br>${text}`;
    } else {
      messageDiv.innerHTML = `<span class="message-label bot-label">🤖 Vale Bot:</span><br><br>${text}`;
    }
    const chatContainer = document.getElementById('chatContainer');
    chatContainer.appendChild(messageDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }

  async function askValeBot(question) {
    const cfgAsk = (window.PROFE_VALE_CONFIG && window.PROFE_VALE_CONFIG.RAG_ASK_URL) || '';
    if (cfgAsk) {
      const res = await fetch(cfgAsk, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question }) });
      if (!res.ok) throw new Error('Error al llamar a Vale Bot');
      return await res.json();
    }

    const proxyKey = 'ai_proxy_url';
    const cfgGemini = (window.PROFE_VALE_CONFIG && window.PROFE_VALE_CONFIG.GEMINI_PROXY_URL) || '';
    const proxy = (cfgGemini || localStorage.getItem(proxyKey) || '').trim();
    let endpoint = '';
    if (proxy) {
      try {
        const u = new URL(proxy);
        // si termina en /api/gemini -> reemplazar; si no, asegurar /api/ask
        if (u.pathname.endsWith('/api/gemini')) {
          u.pathname = u.pathname.replace(/\/api\/gemini$/, '/api/ask');
        } else if (!u.pathname.endsWith('/api/ask')) {
          u.pathname = (u.pathname.replace(/\/$/, '')) + '/api/ask';
        }
        endpoint = u.toString();
      } catch {}
    }
    if (!endpoint) return { answer: 'Falta configurar el proxy. Andá a Recursos → Playground y pegá tu URL /api/gemini. Luego volvé aquí.', sources: [] };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question })
    });
    if (!res.ok) throw new Error('Error al llamar a Vale Bot');
    return await res.json();
  }

  async function sendMessage() {
    const chatInput = document.getElementById('chatInput');
    const sendBtn = document.getElementById('sendBtn');
    const message = chatInput.value.trim();
    if (!message) return;

    addMessage(message, true);
    chatInput.value = '';
    sendBtn.disabled = true;
    sendBtn.textContent = 'Procesando...';

    try {
      const { answer, sources } = await askValeBot(message);
      const src = sources && sources.length ? `<br><small style="opacity:.8">Fuentes: ${sources.join(', ')}</small>` : '';
      addMessage((answer || 'Sin respuesta') + src);
    } catch (e) {
      addMessage('Error: ' + e.message);
    } finally {
      sendBtn.disabled = false;
      sendBtn.textContent = 'Enviar';
      chatInput.focus();
    }
  }

  window.askSuggestion = function(q) {
    document.getElementById('chatInput').value = q;
    sendMessage();
  };

  const hasProxy = !!(((window.PROFE_VALE_CONFIG && (window.PROFE_VALE_CONFIG.RAG_ASK_URL || window.PROFE_VALE_CONFIG.GEMINI_PROXY_URL)) || localStorage.getItem('ai_proxy_url')) || '').trim();
  const notice = document.getElementById('proxyNotice');
  if (notice) notice.style.display = hasProxy ? 'none' : 'block';

  document.getElementById('sendBtn').addEventListener('click', sendMessage);
  document.getElementById('chatInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
  });
})();
