/*
  profevale.com.ar - consentimiento y registro de aceptaciones (BORRADOR)
  - Banner de cookies con Aceptar / Rechazar.
  - Si la persona rechaza (o todavía no eligió), los videos de YouTube, Facebook e
    Instagram se abren en una pestaña nueva en vez de cargarse dentro de la página.
  - Registro de aceptaciones: envía fecha y versión del documento al endpoint
    PV_LEGAL_CONFIG.REGISTRO_URL (Cloudflare Worker de workers/consentimientos).
    La IP la toma el servidor; el navegador no la conoce.
  - Pie legal: si la página no tiene enlaces legales propios, los agrega.
*/
(function(){
  var VERSIONES = {
    terminos:   '0.1-borrador-2026-11-27',
    privacidad: '0.1-borrador-2026-11-27',
    cookies:    '0.1-borrador-2026-11-27',
    reembolso:  '0.1-borrador-2026-11-27'
  };
  var CFG = window.PV_LEGAL_CONFIG || {};
  var REGISTRO_URL = CFG.REGISTRO_URL || '';
  // Ruta a la carpeta legal/ desde la página actual
  var base = (function(){
    var s = document.currentScript && document.currentScript.getAttribute('src') || 'legal/legal.js';
    return s.replace(/legal\.js(\?.*)?$/, '');
  })();
  var KEY = 'pv_cookies';

  function leer(){ try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch(e){ return null; } }
  function guardar(v){ try { localStorage.setItem(KEY, JSON.stringify(v)); } catch(e){} }

  function registrar(evento){
    // evento: {origen, documentos:{terminos:ver,...}, decision?}
    var datos = {
      origen: evento.origen,
      documentos: evento.documentos || {},
      decision: evento.decision || null,
      pagina: location.pathname,
      fecha_cliente: new Date().toISOString()
    };
    if(!REGISTRO_URL) return false;
    var cuerpo = JSON.stringify(datos);
    try {
      if(navigator.sendBeacon){
        return navigator.sendBeacon(REGISTRO_URL, new Blob([cuerpo], {type:'text/plain'}));
      }
      fetch(REGISTRO_URL, {method:'POST', body:cuerpo, keepalive:true, headers:{'Content-Type':'text/plain'}});
      return true;
    } catch(e){ return false; }
  }

  function elegir(decision){
    guardar({decision:decision, version:VERSIONES.cookies, fecha:new Date().toISOString()});
    registrar({origen:'banner-cookies', decision:decision, documentos:{cookies:VERSIONES.cookies}});
    var b = document.getElementById('pv-cookies'); if(b) b.remove();
  }

  function mostrarBanner(){
    if(document.getElementById('pv-cookies')) return;
    var d = document.createElement('div');
    d.id = 'pv-cookies';
    d.setAttribute('role','dialog');
    d.setAttribute('aria-label','Aviso de cookies');
    d.style.cssText = 'position:fixed;left:16px;right:16px;bottom:16px;z-index:9999;max-width:620px;margin:0 auto;background:#fff;color:#13263A;border:2px solid #005388;border-radius:14px;padding:16px 18px;font:500 15px/1.5 Montserrat,system-ui,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.18)';
    d.innerHTML = '<p style="margin:0 0 12px">Esta página no usa cookies propias de seguimiento. Los videos de YouTube, Facebook e Instagram sí pueden dejar cookies de esas empresas cuando los mirás acá. Si rechazás, los videos se abren en su sitio, en otra pestaña. <a href="'+base+'cookies.html" style="color:#005388">Política de Cookies</a></p>'+
      '<div style="display:flex;gap:10px;flex-wrap:wrap">'+
      '<button type="button" data-d="aceptado" style="background:#005388;color:#fff;border:0;border-radius:999px;padding:10px 20px;font:800 15px Montserrat,system-ui,sans-serif;cursor:pointer">Aceptar</button>'+
      '<button type="button" data-d="rechazado" style="background:#fff;color:#005388;border:2px solid #005388;border-radius:999px;padding:8px 20px;font:800 15px Montserrat,system-ui,sans-serif;cursor:pointer">Rechazar</button>'+
      '</div>';
    d.addEventListener('click', function(e){ var x = e.target.getAttribute && e.target.getAttribute('data-d'); if(x) elegir(x); });
    document.body.appendChild(d);
  }

  function pieLegal(){
    if(document.querySelector('.legal-links')) return;
    var p = document.createElement('nav');
    p.className = 'legal-links';
    p.setAttribute('aria-label','Información legal');
    p.style.cssText = 'text-align:center;padding:18px 16px;font:500 13px/1.8 Montserrat,system-ui,sans-serif;background:#FAF7F2;color:#4F5F6E';
    p.innerHTML = enlaces('color:#005388');
    document.body.appendChild(p);
  }
  function enlaces(estilo){
    var l = [['terminos.html','Términos y Condiciones'],['privacidad.html','Política de Privacidad'],['cookies.html','Política de Cookies'],['reembolso.html','Reembolso y Arrepentimiento'],['reembolso.html#boton','Botón de arrepentimiento']];
    return l.map(function(x){ return '<a href="'+base+x[0]+'" style="'+estilo+';margin:0 8px">'+x[1]+'</a>'; }).join(' ')+
      ' <a href="#" onclick="PV_LEGAL.configurar();return false" style="'+estilo+';margin:0 8px">Configurar cookies</a>';
  }

  // Formularios con aceptación: <form data-pv-acepta="nombre-del-formulario">
  // Deben tener dos casillas sin tildar: name/id "acepto_terminos" y "acepto_privacidad", con required.
  function conectarFormularios(){
    var fs = document.querySelectorAll('form[data-pv-acepta]');
    Array.prototype.forEach.call(fs, function(f){
      f.addEventListener('submit', function(e){
        var t = f.querySelector('[data-pv="terminos"]'), p = f.querySelector('[data-pv="privacidad"]');
        if(!t || !p || !t.checked || !p.checked){
          e.preventDefault();
          alertaEn(f, 'Para enviar, tildá las dos casillas: Términos y Condiciones y Política de Privacidad.');
          return;
        }
        var docs = {terminos:VERSIONES.terminos, privacidad:VERSIONES.privacidad};
        registrar({origen:f.getAttribute('data-pv-acepta'), documentos:docs});
        var hv = f.querySelector('input[name="version_terminos"]'); if(hv) hv.value = VERSIONES.terminos;
        var hp = f.querySelector('input[name="version_privacidad"]'); if(hp) hp.value = VERSIONES.privacidad;
        var hf = f.querySelector('input[name="fecha_aceptacion"]'); if(hf) hf.value = new Date().toISOString();
      });
    });
  }
  function alertaEn(f, txt){
    var m = f.querySelector('.pv-aviso');
    if(!m){ m = document.createElement('p'); m.className='pv-aviso'; m.setAttribute('role','alert'); m.style.cssText='color:#B34700;font-weight:700;margin:8px 0 0'; f.appendChild(m); }
    m.textContent = txt;
  }

  window.PV_LEGAL = {
    versiones: VERSIONES,
    embedsOk: function(){ var c = leer(); return !!(c && c.decision === 'aceptado'); },
    configurar: function(){ try{ localStorage.removeItem(KEY); }catch(e){} mostrarBanner(); },
    registrar: registrar,
    enlaces: enlaces
  };

  function iniciar(){
    if(!leer()) mostrarBanner();
    pieLegal();
    conectarFormularios();
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
