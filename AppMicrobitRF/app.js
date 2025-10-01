// app.js - Teachable Machine + micro:bit
let model, webcam, ctx, overlay, maxPredictions;
let btDevice, btServer, uartService, txChar;
let lastClass = "";
let isBtConnected = false;

const MODEL_STATUS = document.getElementById('modelStatus');
const BT_STATUS = document.getElementById('btStatus');
const PREDICTION = document.getElementById('prediction');
const LOAD_MODEL_BTN = document.getElementById('loadModelBtn');
const CONNECT_BTN = document.getElementById('connectBtn');
const DISCONNECT_BTN = document.getElementById('disconnectBtn');
const MODEL_URL_INPUT = document.getElementById('modelUrl');
const VIDEO = document.getElementById('webcam');
overlay = document.getElementById('overlay');
ctx = overlay.getContext('2d');

// --- Modelo Teachable Machine ---
LOAD_MODEL_BTN.onclick = async () => {
    const url = MODEL_URL_INPUT.value.trim();
    if (!url.match(/^https:\/\/storage\.googleapis\.com\/tm-model\//)) {
        MODEL_STATUS.textContent = 'URL inválida. Debe ser de Google Storage.';
        return;
    }
    MODEL_STATUS.textContent = 'Cargando modelo...';
    try {
        model = await tmImage.load(url + 'model.json', url + 'metadata.json');
        maxPredictions = model.getTotalClasses();
        MODEL_STATUS.textContent = 'Modelo cargado correctamente.';
        startWebcam();
    } catch (e) {
        MODEL_STATUS.textContent = 'Error al cargar el modelo.';
    }
};

// --- Webcam y predicción ---
async function startWebcam() {
    try {
        const constraints = {
            video: { facingMode: { ideal: "environment" } }
        };
        VIDEO.srcObject = await navigator.mediaDevices.getUserMedia(constraints);
        VIDEO.onloadedmetadata = () => {
            VIDEO.play();
            overlay.width = VIDEO.videoWidth;
            overlay.height = VIDEO.videoHeight;
            predictLoop();
        };
    } catch (e) {
        PREDICTION.textContent = 'No se pudo acceder a la cámara.';
    }
}

async function predictLoop() {
    if (!model) return;
    ctx.clearRect(0, 0, overlay.width, overlay.height);
    const prediction = await model.predict(VIDEO);
    let best = prediction[0];
    for (let p of prediction) if (p.probability > best.probability) best = p;
    PREDICTION.textContent = `${best.className} (${(best.probability*100).toFixed(1)}%)`;
    // Overlay
    ctx.font = '24px Arial';
    ctx.fillStyle = 'rgba(45,140,240,0.8)';
    ctx.fillText(`${best.className}: ${(best.probability*100).toFixed(1)}%`, 10, 30);
    // Enviar a micro:bit si confianza > 70%
    if (isBtConnected && best.probability > 0.7 && best.className !== lastClass) {
        sendToMicrobit(best.className);
        lastClass = best.className;
    }
    requestAnimationFrame(predictLoop);
}

// --- Bluetooth micro:bit ---
CONNECT_BTN.onclick = async () => {
    BT_STATUS.textContent = 'Buscando micro:bit...';
    try {
        btDevice = await navigator.bluetooth.requestDevice({
            filters: [{ namePrefix: 'BBC micro:bit' }],
            optionalServices: ['6e400001-b5a3-f393-e0a9-e50e24dcca9e']
        });
        btDevice.addEventListener('gattserverdisconnected', onDisconnected);
        btServer = await btDevice.gatt.connect();
        uartService = await btServer.getPrimaryService('6e400001-b5a3-f393-e0a9-e50e24dcca9e');
        txChar = await uartService.getCharacteristic('6e400002-b5a3-f393-e0a9-e50e24dcca9e');
        isBtConnected = true;
        BT_STATUS.textContent = '¡micro:bit conectado!';
        CONNECT_BTN.disabled = true;
        DISCONNECT_BTN.disabled = false;
    } catch (e) {
        BT_STATUS.textContent = 'No se pudo conectar.';
    }
};

DISCONNECT_BTN.onclick = async () => {
    if (btDevice && btDevice.gatt.connected) {
        await btDevice.gatt.disconnect();
    }
    isBtConnected = false;
    BT_STATUS.textContent = 'Desconectado.';
    CONNECT_BTN.disabled = false;
    DISCONNECT_BTN.disabled = true;
};

function onDisconnected() {
    isBtConnected = false;
    BT_STATUS.textContent = 'Desconectado.';
    CONNECT_BTN.disabled = false;
    DISCONNECT_BTN.disabled = true;
}

async function sendToMicrobit(text) {
    if (!txChar) return;
    try {
        const encoder = new TextEncoder();
        await txChar.writeValue(encoder.encode(text + '\n'));
    } catch (e) {
        BT_STATUS.textContent = 'Error enviando a micro:bit.';
    }
}
