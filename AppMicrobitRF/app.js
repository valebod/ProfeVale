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
            // Dibujar un simple recuadro aproximado con los puntos
            const p = predictions[0];
            const box = p.box || p.boundingBox || null;
            if (box) {
                const x = box.xMin || box.topLeft[0];
                const y = box.yMin || box.topLeft[1];
                const w = (box.xMax || box.bottomRight[0]) - x;
                const h = (box.yMax || box.bottomRight[1]) - y;
                ctx.strokeStyle = '#00d2ff';
                ctx.lineWidth = 2;
                ctx.strokeRect(x, y, w, h);
            }
            // Enviar un ejemplo simple: visible:1
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
