// app.js - Reconocimiento Facial + micro:bit
let videoEl = document.getElementById('video');
let canvasEl = document.getElementById('canvas');
let ctx = canvasEl.getContext('2d');
let startBtn = document.getElementById('startBtn');
let stopBtn = document.getElementById('stopBtn');
let toggleCameraBtn = document.getElementById('toggleCameraBtn');
let facingMode = 'user';
let detectionRunning = false;
let cameraOn = false;
let drawOverlayOn = true;
let lastSendTs = 0;
const unMirrorFront = true; // Forzar no-"espejo" en cámara frontal
let advancedMode = false;
const SEND_INTERVAL_MS = 100; // ~10Hz compatible con UART

// Utilidades matemáticas globales
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const deg = (rad) => rad * 180 / Math.PI;
const dist = (a,b) => Math.hypot(a[0]-b[0], a[1]-b[1]);

// Bluetooth
let device, server, uartService, txChar;
let isBtConnected = false;
const connectBtn = document.getElementById('connectBtn');
const statusBadge = document.getElementById('statusBadge');
const sendCountEl = document.getElementById('sendCount');
let sendCount = 0;
const advBtn = document.getElementById('advBtn');
const testSendBtn = document.getElementById('testSendBtn');
if (advBtn) {
    advBtn.addEventListener('click', () => {
        advancedMode = !advancedMode;
        advBtn.textContent = advancedMode ? 'Modo avanzado: ON' : 'Modo avanzado: OFF';
    });
}

// Inicialización cámara
async function initCamera() {
    try {
        // Detener stream previo y solicitar uno nuevo con facingMode
        const prev = videoEl.srcObject;
        if (prev) { try { prev.getTracks().forEach(t=>t.stop()); } catch(_){} }
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode } });
        videoEl.srcObject = stream;
        await videoEl.play();
        canvasEl.width = videoEl.videoWidth || 480;
        canvasEl.height = videoEl.videoHeight || 360;
        cameraOn = true;
        // Aplicar (des)espejado en frontal y mantener overlay alineado
        const flip = (facingMode === 'user' && unMirrorFront) ? 'scaleX(-1)' : 'none';
        videoEl.style.transform = flip;
        canvasEl.style.transform = flip;
        startBtn.disabled = false;
        stopBtn.disabled = false;
        // Botón de overlay
        startBtn.textContent = drawOverlayOn ? 'Ocultar líneas' : 'Mostrar líneas';
        // Botón de cámara
        stopBtn.textContent = cameraOn ? 'Apagar cámara' : 'Encender cámara';
    } catch (e) {
        console.error('Error accediendo a la cámara:', e);
        startBtn.disabled = true;
        stopBtn.disabled = true;
    }
}

// Reemplazar por versión con try/catch abajo
toggleCameraBtn.addEventListener('click', async () => {
    try {
        facingMode = facingMode === 'user' ? 'environment' : 'user';
        await initCamera();
    } catch (e) {
        console.error('No se pudo cambiar de cámara:', e);
    }
});

// Detección facial (placeholder; el modelo real se carga via script en index.html)
let model;
async function loadModelOnce() {
    if (model) return model;
    try {
        // face-landmarks-detection API v0.0.3
        model = await faceLandmarksDetection.load(faceLandmarksDetection.SupportedPackages.mediapipeFacemesh);
        return model;
    } catch (e) {
        console.error('Error cargando modelo de rostro:', e);
        return null;
    }
}

async function startDetection() {
    const m = await loadModelOnce();
    if (!m) return;
    detectionRunning = true;
    loopDetection();
}

async function loopDetection() {
    if (!detectionRunning) return;
        try {
            if (!cameraOn || videoEl.readyState < 2) {
                ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
                await sendPacketZeros();
                requestAnimationFrame(loopDetection);
                return;
            }
            const predictions = await model.estimateFaces({ input: videoEl, returnTensors: false });
        ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
        if (predictions && predictions.length > 0) {
            const p = predictions[0];
            const ann = p.annotations || {};

            // Helpers de dibujo
            const drawPath = (points, { close=false, color='#00d2ff', width=2, glow=12 }={}) => {
                if (!points || points.length === 0) return;
                ctx.save();
                ctx.strokeStyle = color;
                ctx.lineWidth = width;
                ctx.shadowColor = color;
                ctx.shadowBlur = glow;
                ctx.beginPath();
                ctx.moveTo(points[0][0], points[0][1]);
                for (let i=1;i<points.length;i++) ctx.lineTo(points[i][0], points[i][1]);
                if (close) ctx.closePath();
                ctx.stroke();
                ctx.restore();
            };
            const drawPoints = (points, { color='#39ff14', radius=2.5, glow=10 }={}) => {
                if (!points) return;
                ctx.save();
                ctx.fillStyle = color;
                ctx.shadowColor = color;
                ctx.shadowBlur = glow;
                for (const pt of points) {
                    ctx.beginPath();
                    ctx.arc(pt[0], pt[1], radius, 0, Math.PI*2);
                    ctx.fill();
                }
                ctx.restore();
            };

            // Helper centro promedio
            const center = (pts) => {
                if (!pts || pts.length===0) return null;
                let sx=0, sy=0; for (const pt of pts) { sx+=pt[0]; sy+=pt[1]; }
                return [sx/pts.length, sy/pts.length];
            };

            // (utilidades matemáticas ya definidas arriba)

            // --- Caja/medidas de cara antes de cálculos ---
            const box = p.box || p.boundingBox || null;
            let faceW = canvasEl.width, faceH = canvasEl.height;
            let centerX = canvasEl.width/2, centerY = canvasEl.height/2;
            if (box) {
                const x = box.xMin || box.topLeft[0];
                const y = box.yMin || box.topLeft[1];
                const w = (box.xMax || box.bottomRight[0]) - x;
                const h = (box.yMax || box.bottomRight[1]) - y;
                faceW = w; faceH = h; centerX = x + w/2; centerY = y + h/2;
            }

            // Silueta (contorno de la cara)
            if (drawOverlayOn && ann.silhouette) drawPath(ann.silhouette, { close:false, color:'#00d2ff', width:2, glow:18 });

            // Cejas
            if (drawOverlayOn && ann.leftEyebrowUpper) drawPath(ann.leftEyebrowUpper, { color:'#39ff14', width:2, glow:14 });
            if (drawOverlayOn && ann.leftEyebrowLower) drawPath(ann.leftEyebrowLower, { color:'#39ff14', width:2, glow:14 });
            if (drawOverlayOn && ann.rightEyebrowUpper) drawPath(ann.rightEyebrowUpper, { color:'#39ff14', width:2, glow:14 });
            if (drawOverlayOn && ann.rightEyebrowLower) drawPath(ann.rightEyebrowLower, { color:'#39ff14', width:2, glow:14 });

            // Ojos
            const eyeColor = '#ffee00';
            const leftEye = ann.leftEyeUpper0 ? [
                ...(ann.leftEyeUpper0||[]), ...(ann.leftEyeUpper1||[]), ...(ann.leftEyeLower0||[]), ...(ann.leftEyeLower1||[])
            ] : null;
            const rightEye = ann.rightEyeUpper0 ? [
                ...(ann.rightEyeUpper0||[]), ...(ann.rightEyeUpper1||[]), ...(ann.rightEyeLower0||[]), ...(ann.rightEyeLower1||[])
            ] : null;
            // Ojos: apertura por ojo y promedio
            const verticalEyeOpenness = (upper, lower) => {
                const pts = [ ...(upper||[]), ...(lower||[]) ];
                if (!pts.length) return 0;
                const top = (upper && upper.length) ? center(upper) : pts[0];
                const bottom = (lower && lower.length) ? center(lower) : pts[Math.floor(pts.length/2)];
                return dist(top, bottom) / (faceH || 1);
            };
            const leftOpen = clamp(verticalEyeOpenness(ann.leftEyeUpper0, ann.leftEyeLower0) * 3, 0, 1);
            const rightOpen = clamp(verticalEyeOpenness(ann.rightEyeUpper0, ann.rightEyeLower0) * 3, 0, 1);
            const eyesOpen = clamp((leftOpen + rightOpen)/2, 0, 1);
            if (drawOverlayOn && leftEye) drawPath(leftEye, { close:true, color:eyeColor, width:2, glow:12 });
            if (drawOverlayOn && rightEye) drawPath(rightEye, { close:true, color:eyeColor, width:2, glow:12 });
            // Centros aproximados de ojos
            const leftCenter = center(leftEye);
            const rightCenter = center(rightEye);
            if (drawOverlayOn && leftCenter) drawPoints([leftCenter], { color:'#ffffff', radius:2.5, glow:8 });
            if (drawOverlayOn && rightCenter) drawPoints([rightCenter], { color:'#ffffff', radius:2.5, glow:8 });

            // Nariz
            if (drawOverlayOn && ann.noseBridge) drawPath(ann.noseBridge, { color:'#9b59b6', width:3, glow:16 });
            if (drawOverlayOn && ann.noseTip) drawPoints(ann.noseTip, { color:'#9b59b6', radius:3, glow:12 });

            // Labios (exteriores/interiores) con comisuras destacadas
            const lipsOuter = [
                ...(ann.lipsUpperOuter||[]),
                ...(ann.lipsLowerOuter||[])
            ];
            const lipsInner = [
                ...(ann.lipsUpperInner||[]),
                ...(ann.lipsLowerInner||[])
            ];
            if (drawOverlayOn && lipsOuter.length>0) drawPath(lipsOuter, { close:true, color:'#ff2e63', width:3, glow:18 });
            if (drawOverlayOn && lipsInner.length>0) drawPath(lipsInner, { close:true, color:'#ff8fab', width:2, glow:14 });
            // Comisuras: usar minX y maxX de labios exteriores
            if (lipsOuter.length>0) {
                let leftCorner = lipsOuter[0], rightCorner = lipsOuter[0];
                for (const pt of lipsOuter) {
                    if (pt[0] < leftCorner[0]) leftCorner = pt;
                    if (pt[0] > rightCorner[0]) rightCorner = pt;
                }
                        if (drawOverlayOn) drawPoints([leftCorner, rightCorner], { color:'#fffb00', radius:4, glow:16 });
            }

            // Modo avanzado: puntos del mesh
            if (advancedMode && drawOverlayOn && p.scaledMesh) {
                drawPoints(p.scaledMesh, { color:'#00d2ff', radius:1.2, glow:4 });
            }

                    // --- Cálculo de parámetros (usa medidas ya obtenidas) ---

                    // const norm = (v, max) => Math.max(0, Math.min(1, v / max));

                    // x,y normalizados 0..1
                    const xN = clamp(centerX / canvasEl.width, 0, 1);
                    const yN = clamp(centerY / canvasEl.height, 0, 1);

                    // z aproximada: inverso del tamaño (cara grande => z pequeño)
                    const sizeRatio = clamp(Math.max(faceW, faceH) / Math.max(canvasEl.width, canvasEl.height), 0.05, 1);
                    const zN = clamp(1 - sizeRatio, 0, 1);

                    // Ojos centers ya calculados
                    let rollDeg = 0;
                    if (leftCenter && rightCenter) {
                        rollDeg = deg(Math.atan2(rightCenter[1]-leftCenter[1], rightCenter[0]-leftCenter[0]));
                    }

                    // Yaw/Pitch aproximados
                    const noseCenter = ann.noseTip && ann.noseTip.length ? center(ann.noseTip) : [centerX, centerY];
                    const dx = (noseCenter[0] - centerX) / (faceW || 1);
                    const dy = (noseCenter[1] - centerY) / (faceH || 1);
                    const yawDeg = clamp(dx * 60, -60, 60);
                    const pitchDeg = clamp(-dy * 60, -60, 60);

                    // Boca: apertura relativa
                    const lipsUpperMid = ann.lipsUpperInner && ann.lipsUpperInner[Math.floor(ann.lipsUpperInner.length/2)];
                    const lipsLowerMid = ann.lipsLowerInner && ann.lipsLowerInner[Math.floor(ann.lipsLowerInner.length/2)];
                    let mouthOpen = 0;
                    if (lipsUpperMid && lipsLowerMid) mouthOpen = clamp(dist(lipsUpperMid, lipsLowerMid) / (faceH || 1), 0, 1);

                    // (cálculo de apertura de ojos se hizo arriba: leftOpen/rightOpen/eyesOpen)

                    // Sonrisa: ancho de boca relativo
                    let smile = 0;
                    if (lipsOuter.length>0) {
                        let leftCorner = lipsOuter[0], rightCorner = lipsOuter[0];
                        for (const pt of lipsOuter) {
                            if (pt[0] < leftCorner[0]) leftCorner = pt;
                            if (pt[0] > rightCorner[0]) rightCorner = pt;
                        }
                        smile = clamp(dist(leftCorner, rightCorner) / (faceW || 1), 0, 1);
                    }

                    const visible = 1;
                    const confidence = 1;
                    const blink = eyesOpen < 0.04 ? 1 : 0;

                    // Actualizar UI
                    const setText = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };
                    setText('x-value', xN.toFixed(2));
                    setText('y-value', yN.toFixed(2));
                    setText('z-value', zN.toFixed(2));
                    setText('yaw-value', yawDeg.toFixed(0));
                    setText('pitch-value', pitchDeg.toFixed(0));
                    setText('roll-value', rollDeg.toFixed(0));
                    setText('mouth-value', mouthOpen.toFixed(2));
                    setText('eyes-value', eyesOpen.toFixed(2));
                    setText('smile-value', smile.toFixed(2));
                    setText('visible-value', '✔');
                    setText('confidence-value', (confidence*100).toFixed(0));
                    setText('blink-value', blink ? '✔' : '✖');

                    // Envío (~10 Hz)
                    const now = Date.now();
                    if (now - lastSendTs > SEND_INTERVAL_MS) {
                        lastSendTs = now;
                        await sendFixedPacket({
                            xN, yN, zN, yawDeg, pitchDeg, rollDeg, mouthOpen,
                            leftOpen, rightOpen, smile, visible
                        });
                    }
        } else {
                    // Limpiar UI cuando no hay rostro
                    const setText = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };
                    setText('visible-value', '✖');
                    await sendPacketZeros();
        }
    } catch (e) {
        console.error('Error en loop detección:', e);
    }
    requestAnimationFrame(loopDetection);
}

function stopDetection() {
    detectionRunning = false;
}

// Botón de líneas: mostrar/ocultar (detección corre mientras haya cámara)
startBtn.addEventListener('click', () => {
    drawOverlayOn = !drawOverlayOn;
    startBtn.textContent = drawOverlayOn ? 'Ocultar líneas' : 'Mostrar líneas';
});

// Botón de cámara: apagar/encender
stopBtn.addEventListener('click', async () => {
    if (cameraOn) {
        const stream = videoEl.srcObject;
        if (stream) stream.getTracks().forEach(t => t.stop());
        videoEl.srcObject = null;
        cameraOn = false;
    } else {
        await initCamera();
    }
    stopBtn.textContent = cameraOn ? 'Apagar cámara' : 'Encender cámara';
});

// Bluetooth
function supportsWebBluetooth() {
    const secure = (window.isSecureContext === true) || location.protocol === 'https:' || location.hostname === 'localhost';
    const hasApi = !!(navigator && navigator.bluetooth);
    return secure && hasApi;
}

function logFeedback(msg) {
    const fb = document.getElementById('feedback');
    if (!fb) return;
    const span = document.createElement('span');
    span.textContent = msg;
    span.style.fontSize = '0.8rem';
    span.style.color = '#a8e6ff';
    fb.appendChild(span);
}

connectBtn.addEventListener('click', async () => {
    if (!supportsWebBluetooth()) {
        alert('Tu navegador no soporta Web Bluetooth o esta página no está en HTTPS. Usá Chrome/Edge en HTTPS (o Bluefy en iOS).');
        logFeedback('❌ Web Bluetooth no disponible. Verificá HTTPS y navegador.');
        return;
    }
    // Si ya está conectado, desconectar primero
    try { if (device && device.gatt && device.gatt.connected) device.gatt.disconnect(); } catch(_){}
    statusBadge.textContent = 'Buscando micro:bit...';
    logFeedback('🔎 Buscando dispositivos...');
    const UART_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
    const TX_UUID = '6e400002-b5a3-f393-e0a9-e50e24dcca9e';
    const RX_UUID = '6e400003-b5a3-f393-e0a9-e50e24dcca9e';
    try {
        if (navigator.bluetooth.getAvailability) {
            const avail = await navigator.bluetooth.getAvailability();
            logFeedback('📶 Bluetooth disponible: ' + (avail ? 'sí' : 'no'));
        }
    } catch(_){}
    try {
        try {
            device = await navigator.bluetooth.requestDevice({
                filters: [
                    { namePrefix: 'BBC micro:bit' },
                    { namePrefix: 'micro:bit' },
                    { services: [UART_UUID] }
                ],
                optionalServices: [UART_UUID]
            });
        } catch (e1) {
            // Fallback amplio
            logFeedback('ℹ️ Reintentando con búsqueda amplia...');
            device = await navigator.bluetooth.requestDevice({
                acceptAllDevices: true,
                optionalServices: [UART_UUID]
            });
        }
        device.addEventListener('gattserverdisconnected', onDisconnected);
        server = await device.gatt.connect();
        logFeedback('✅ Conectado al GATT');
        uartService = await server.getPrimaryService(UART_UUID);
        txChar = await uartService.getCharacteristic(TX_UUID);
        // Suscribirse a RX si está disponible (para debug)
        try {
            const rxChar = await uartService.getCharacteristic(RX_UUID);
            await rxChar.startNotifications();
            rxChar.addEventListener('characteristicvaluechanged', (event) => {
                const dec = new TextDecoder();
                const txt = dec.decode(event.target.value);
                logFeedback('📥 ' + txt.trim());
            });
        } catch (_) {}
        isBtConnected = true;
        statusBadge.textContent = '¡Conectado!';
        logFeedback('🔗 UART listo');
    } catch (e) {
        statusBadge.textContent = 'Error de conexión';
        logFeedback('⚠️ ' + (e && e.message ? e.message : 'Fallo al conectar'));
    }
});

function onDisconnected() {
    isBtConnected = false;
    statusBadge.textContent = 'Desconectado';
    logFeedback('🔌 Desconectado');
}

async function sendToMicrobit(text) {
    if (!isBtConnected || !txChar) return;
    try {
        const encoder = new TextEncoder();
        // Escribir payload y newline por separado mejora compatibilidad en algunos firmwares
        await txChar.writeValue(encoder.encode(text));
        await txChar.writeValue(encoder.encode('\n'));
        sendCount++;
        sendCountEl.textContent = sendCount;
        logFeedback('📤 ' + text);
    } catch (e) {
        logFeedback('⚠️ Error al enviar');
    }
}

// Empaquetado fijo de 19 caracteres (MakeCode)
function pad2(v) { v = Math.max(0, Math.min(99, Math.round(v))); return v.toString().padStart(2,'0'); }
function mapTo99(from, min, max) { const c = Math.max(min, Math.min(max, from)); return ((c - min) / (max - min)) * 99; }
async function sendFixedPacket({ xN, yN, zN, yawDeg, pitchDeg, rollDeg, mouthOpen, leftOpen, rightOpen, smile, visible }) {
    const posX = pad2(xN * 99);
    const posY = pad2(yN * 99);
    const distancia = pad2(zN * 99);
    const guinada = pad2(mapTo99(yawDeg, -60, 60));
    const inclinacion = pad2(mapTo99(pitchDeg, -60, 60));
    const boca = pad2(mouthOpen * 99);
    const ojoIzq = pad2(leftOpen * 99);
    const ojoDer = pad2(rightOpen * 99);
    const giro = (rollDeg > 0 ? '1' : '0');
    const sonrisa = (smile > 0.5 ? '1' : '0');
    const rostroVisible = visible ? '1' : '0';
    const paquete = `${posX}${posY}${distancia}${guinada}${inclinacion}${boca}${ojoIzq}${ojoDer}${giro}${sonrisa}${rostroVisible}`;
    if (paquete.length === 19) {
        await sendToMicrobit(paquete);
    }
}

async function sendPacketZeros() {
    // 8 campos de 2 dígitos en 00 -> 16, más 3 de 1 dígito -> 000 => 19
    await sendToMicrobit('0000000000000000000');
}

// Botón de prueba de envío UART
if (testSendBtn) {
    testSendBtn.addEventListener('click', async () => {
        // X(50) Y(50) Z(50) Yaw(50) Pitch(50) Mouth(50) Left(50) Right(50) Roll(0) Smile(0) Visible(1)
        await sendToMicrobit('5050505050505050001');
    });
}

// Arranque
initCamera();
startDetection();
