// app.js - Reconocimiento Facial + micro:bit
let videoEl = document.getElementById('video');
let canvasEl = document.getElementById('canvas');
let ctx = canvasEl.getContext('2d');
let startBtn = document.getElementById('startBtn');
let stopBtn = document.getElementById('stopBtn');
let toggleCameraBtn = document.getElementById('toggleCameraBtn');
let facingMode = 'user';
let detectionRunning = false;

// Bluetooth
let device, server, uartService, txChar;
let isBtConnected = false;
const connectBtn = document.getElementById('connectBtn');
const statusBadge = document.getElementById('statusBadge');
const sendCountEl = document.getElementById('sendCount');
let sendCount = 0;

// Inicialización cámara
async function initCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode } });
        videoEl.srcObject = stream;
        await videoEl.play();
        canvasEl.width = videoEl.videoWidth || 480;
        canvasEl.height = videoEl.videoHeight || 360;
        startBtn.disabled = false;
        stopBtn.disabled = false;
    } catch (e) {
        console.error('Error accediendo a la cámara:', e);
        startBtn.disabled = true;
        stopBtn.disabled = true;
    }
}

toggleCameraBtn.addEventListener('click', async () => {
    facingMode = facingMode === 'user' ? 'environment' : 'user';
    await initCamera();
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

            // Silueta (contorno de la cara)
            if (ann.silhouette) drawPath(ann.silhouette, { close:false, color:'#00d2ff', width:2, glow:18 });

            // Cejas
            if (ann.leftEyebrowUpper) drawPath(ann.leftEyebrowUpper, { color:'#39ff14', width:2, glow:14 });
            if (ann.leftEyebrowLower) drawPath(ann.leftEyebrowLower, { color:'#39ff14', width:2, glow:14 });
            if (ann.rightEyebrowUpper) drawPath(ann.rightEyebrowUpper, { color:'#39ff14', width:2, glow:14 });
            if (ann.rightEyebrowLower) drawPath(ann.rightEyebrowLower, { color:'#39ff14', width:2, glow:14 });

            // Ojos
            const eyeColor = '#ffee00';
            const leftEye = ann.leftEyeUpper0 ? [
                ...(ann.leftEyeUpper0||[]), ...(ann.leftEyeUpper1||[]), ...(ann.leftEyeLower0||[]), ...(ann.leftEyeLower1||[])
            ] : null;
            const rightEye = ann.rightEyeUpper0 ? [
                ...(ann.rightEyeUpper0||[]), ...(ann.rightEyeUpper1||[]), ...(ann.rightEyeLower0||[]), ...(ann.rightEyeLower1||[])
            ] : null;
            if (leftEye) drawPath(leftEye, { close:true, color:eyeColor, width:2, glow:12 });
            if (rightEye) drawPath(rightEye, { close:true, color:eyeColor, width:2, glow:12 });
            // Centros aproximados de ojos
            const center = (pts) => {
                if (!pts || pts.length===0) return null;
                let sx=0, sy=0; for (const pt of pts) { sx+=pt[0]; sy+=pt[1]; }
                return [sx/pts.length, sy/pts.length];
            };
            const leftCenter = center(leftEye);
            const rightCenter = center(rightEye);
            if (leftCenter) drawPoints([leftCenter], { color:'#ffffff', radius:2.5, glow:8 });
            if (rightCenter) drawPoints([rightCenter], { color:'#ffffff', radius:2.5, glow:8 });

            // Nariz
            if (ann.noseBridge) drawPath(ann.noseBridge, { color:'#9b59b6', width:3, glow:16 });
            if (ann.noseTip) drawPoints(ann.noseTip, { color:'#9b59b6', radius:3, glow:12 });

            // Labios (exteriores/interiores) con comisuras destacadas
            const lipsOuter = [
                ...(ann.lipsUpperOuter||[]),
                ...(ann.lipsLowerOuter||[])
            ];
            const lipsInner = [
                ...(ann.lipsUpperInner||[]),
                ...(ann.lipsLowerInner||[])
            ];
            if (lipsOuter.length>0) drawPath(lipsOuter, { close:true, color:'#ff2e63', width:3, glow:18 });
            if (lipsInner.length>0) drawPath(lipsInner, { close:true, color:'#ff8fab', width:2, glow:14 });
            // Comisuras: usar minX y maxX de labios exteriores
            if (lipsOuter.length>0) {
                let leftCorner = lipsOuter[0], rightCorner = lipsOuter[0];
                for (const pt of lipsOuter) {
                    if (pt[0] < leftCorner[0]) leftCorner = pt;
                    if (pt[0] > rightCorner[0]) rightCorner = pt;
                }
                drawPoints([leftCorner, rightCorner], { color:'#fffb00', radius:4, glow:16 });
            }

            // Puntos clave opcionales (suaves) para dar efecto llamativo si hace falta
            // drawPoints(p.scaledMesh, { color:'#00d2ff', radius:1.2, glow:4 });

            // Enviar visible
            await sendToMicrobit('visible:1');
        } else {
            await sendToMicrobit('visible:0');
        }
    } catch (e) {
        console.error('Error en loop detección:', e);
    }
    requestAnimationFrame(loopDetection);
}

function stopDetection() {
    detectionRunning = false;
}

startBtn.addEventListener('click', startDetection);
stopBtn.addEventListener('click', stopDetection);

// Bluetooth
connectBtn.addEventListener('click', async () => {
    statusBadge.textContent = 'Buscando micro:bit...';
    try {
        device = await navigator.bluetooth.requestDevice({
            filters: [{ namePrefix: 'BBC micro:bit' }],
            optionalServices: ['6e400001-b5a3-f393-e0a9-e50e24dcca9e']
        });
        device.addEventListener('gattserverdisconnected', onDisconnected);
        server = await device.gatt.connect();
        uartService = await server.getPrimaryService('6e400001-b5a3-f393-e0a9-e50e24dcca9e');
        txChar = await uartService.getCharacteristic('6e400002-b5a3-f393-e0a9-e50e24dcca9e');
        isBtConnected = true;
        statusBadge.textContent = '¡Conectado!';
    } catch (e) {
        statusBadge.textContent = 'Error de conexión';
    }
});

function onDisconnected() {
    isBtConnected = false;
    statusBadge.textContent = 'Desconectado';
}

async function sendToMicrobit(text) {
    if (!isBtConnected || !txChar) return;
    try {
        const encoder = new TextEncoder();
        await txChar.writeValue(encoder.encode(text + '\n'));
        sendCount++;
        sendCountEl.textContent = sendCount;
    } catch (e) {
        // Silencioso para no molestar la UI
    }
}

// Arranque
initCamera();
