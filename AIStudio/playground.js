async function callGemini({ proxyUrl, apiKey, model, prompt, temperature }) {
  const body = { model, prompt, temperature: Number(temperature) || 0.7 };

  if (proxyUrl) {
    const res = await fetch(proxyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(`Proxy error ${res.status}`);
    return await res.json();
  }

  if (!apiKey) throw new Error('Falta API key o proxyUrl');

  // Llamada directa al endpoint de Google AI Studio (solo para pruebas locales)
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const payload = {
    contents: [{ parts: [{ text: prompt }]}],
    generationConfig: { temperature: Number(temperature) || 0.7 }
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(`Google API error ${res.status}`);
  const data = await res.json();
  // Normalizar salida
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || JSON.stringify(data);
  return { text, raw: data };
}

function setOutput(text) {
  const out = document.getElementById('output');
  out.textContent = text;
}

function appendOutput(text) {
  const out = document.getElementById('output');
  out.textContent += text;
}

window.addEventListener('load', () => {
  const runBtn = document.getElementById('runBtn');
  const clearBtn = document.getElementById('clearBtn');
  const copyBtn = document.getElementById('copyBtn');
  const proxyInput = document.getElementById('proxyUrl');

  // Load default proxy from localStorage if available
  const savedProxy = localStorage.getItem('ai_proxy_url');
  if (savedProxy && proxyInput && !proxyInput.value) proxyInput.value = savedProxy;

  runBtn.addEventListener('click', async () => {
    const proxyUrl = document.getElementById('proxyUrl').value.trim();
    const apiKey = document.getElementById('apiKey').value.trim();
    const model = document.getElementById('model').value;
    const prompt = document.getElementById('prompt').value;
    const temperature = document.getElementById('temperature').value;

    if (!prompt) {
      setOutput('Escribí un prompt.');
      return;
    }
    setOutput('Generando respuesta...');
    try {
      if (proxyUrl) localStorage.setItem('ai_proxy_url', proxyUrl);
      const result = await callGemini({ proxyUrl, apiKey, model, prompt, temperature });
      const text = result.text || result.output || JSON.stringify(result, null, 2);
      setOutput(text);
    } catch (err) {
      setOutput('Error: ' + err.message);
      console.error(err);
    }
  });

  clearBtn.addEventListener('click', () => {
    document.getElementById('prompt').value = '';
    setOutput('');
  });

  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(document.getElementById('output').textContent);
      copyBtn.textContent = '✅ Copiado';
      setTimeout(() => (copyBtn.textContent = '📋 Copiar respuesta'), 1500);
    } catch (e) {
      alert('No se pudo copiar');
    }
  });
});
