class MicrobitImageTrainer {
    constructor() {
        this.model = null;
        this.classes = [];
        this.trainingData = {};
        this.currentStream = null;
        this.predictionStream = null;
        this.isTraining = false;
        this.isPredicting = false;
        this.minImagesPerClass = 10;
        this.currentModelName = '';
        this.bluetoothDevice = null;
        this.bluetoothServer = null;
        this.bluetoothService = null;
        this.bluetoothCharacteristic = null;
        this.currentFacingMode = 'environment';
        
        this.initializeEventListeners();
        this.updateClassSelector();
        this.updateDatasetInfo();
        this.loadSavedModels();
    }

    initializeEventListeners() {
        // Gestión de modelos
        document.getElementById('saveModel').addEventListener('click', () => {
            this.saveModel();
        });

        document.getElementById('exportModel').addEventListener('click', () => {
            this.exportModel();
        });

        document.getElementById('importModelBtn').addEventListener('click', () => {
            document.getElementById('modelFileInput').click();
        });

        document.getElementById('modelFileInput').addEventListener('change', (e) => {
            this.importModel(e);
        });

        // Gestión de clases
        document.getElementById('addClassBtn').addEventListener('click', () => {
            this.addClass();
        });

        document.getElementById('classNameInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.addClass();
            }
        });

        // Cámara y captura
        document.getElementById('startCamera').addEventListener('click', () => {
            this.startCamera();
        });

        document.getElementById('switchCamera').addEventListener('click', () => {
            this.switchCamera();
        });

        document.getElementById('uploadImages').addEventListener('click', () => {
            document.getElementById('imageFileInput').click();
        });

        document.getElementById('imageFileInput').addEventListener('change', (e) => {
            this.handleImageUpload(e);
        });

        document.getElementById('captureImage').addEventListener('click', () => {
            this.captureImage();
        });

        // Entrenamiento
        document.getElementById('trainModel').addEventListener('click', () => {
            this.trainModel();
        });

        document.getElementById('resetData').addEventListener('click', () => {
            if (confirm('¿Estás seguro de que quieres eliminar todas las clases e imágenes?')) {
                this.resetData();
            }
        });

        // Predicciones
        document.getElementById('startPrediction').addEventListener('click', () => {
            this.startPrediction();
        });

        document.getElementById('stopPrediction').addEventListener('click', () => {
            this.stopPrediction();
        });

        // Bluetooth
        document.getElementById('connectBluetooth').addEventListener('click', () => {
            this.connectMicrobit();
        });

        document.getElementById('testBluetooth').addEventListener('click', () => {
            this.testBluetooth();
        });
    }

    // ========== GESTIÓN DE MODELOS ==========

    saveModel() {
        const modelNameInput = document.getElementById('modelNameInput');
        const modelName = modelNameInput.value.trim() || `modelo_${new Date().toISOString().slice(0,19).replace(/[:-]/g, '')}`;
        
        if (this.classes.length === 0) {
            alert('No hay clases creadas para guardar');
            return;
        }

        try {
            const modelData = {
                name: modelName,
                timestamp: Date.now(),
                classes: this.classes,
                trainingData: this.serializeTrainingData(),
                totalImages: this.getTotalImages()
            };

            const savedModels = this.getSavedModels();
            savedModels[modelName] = modelData;
            localStorage.setItem('microbit_savedModels', JSON.stringify(savedModels));

            modelNameInput.value = '';
            this.currentModelName = modelName;
            this.loadSavedModels();
            
            this.showMessage(`Modelo "${modelName}" guardado exitosamente con ${this.getTotalImages()} imágenes!`, 'success');
        } catch (error) {
            console.error('Error guardando modelo:', error);
            this.showMessage('Error guardando modelo: ' + error.message, 'error');
        }
    }

    serializeTrainingData() {
        const serialized = {};
        
        this.classes.forEach(className => {
            if (this.trainingData[className]) {
                serialized[className] = this.trainingData[className].map(img => ({
                    dataUrl: img.url,
                    timestamp: img.timestamp || Date.now()
                }));
            }
        });
        
        return serialized;
    }

    async loadModel(modelName) {
        try {
            const savedModels = this.getSavedModels();
            const modelData = savedModels[modelName];

            if (!modelData) {
                throw new Error('Modelo no encontrado');
            }

            // Limpiar datos actuales
            this.classes = [];
            this.trainingData = {};

            // Cargar clases
            this.classes = [...modelData.classes];
            this.currentModelName = modelName;

            // Cargar imágenes desde data URLs
            this.trainingData = {};
            for (const className of this.classes) {
                this.trainingData[className] = [];
                if (modelData.trainingData && modelData.trainingData[className]) {
                    for (const imgData of modelData.trainingData[className]) {
                        this.trainingData[className].push({
                            url: imgData.dataUrl,
                            timestamp: imgData.timestamp
                        });
                    }
                }
            }

            this.updateClassSelector();
            this.renderClasses();
            this.updateDatasetInfo();
            this.renderClassImages();

            this.showMessage(`Modelo "${modelName}" cargado con ${this.getTotalImages()} imágenes!`, 'success');

        } catch (error) {
            console.error('Error cargando modelo:', error);
            this.showMessage('Error cargando modelo: ' + error.message, 'error');
        }
    }

    async exportModel() {
        if (this.classes.length === 0) {
            this.showMessage('No hay modelo para exportar', 'error');
            return;
        }

        try {
            const exportData = {
                name: this.currentModelName || `modelo_${Date.now()}`,
                classes: this.classes,
                timestamp: Date.now(),
                trainingData: this.serializeTrainingData(),
                totalImages: this.getTotalImages(),
                modelType: 'image-classifier',
                version: '1.0',
                creator: 'Profe Vale - Image Trainer'
            };

            const blob = new Blob([JSON.stringify(exportData, null, 2)], 
                { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `${exportData.name}.json`;
            a.click();
            
            URL.revokeObjectURL(url);
            
            this.showMessage('Modelo exportado exitosamente!', 'success');
            
        } catch (error) {
            console.error('Error exportando modelo:', error);
            this.showMessage('Error exportando modelo', 'error');
        }
    }

    async importModel(event) {
        const file = event.target.files[0];
        if (!file) return;

        try {
            const text = await this.readFileAsText(file);
            const modelData = JSON.parse(text);
            
            if (!modelData.classes || !Array.isArray(modelData.classes)) {
                throw new Error('Formato de archivo inválido');
            }

            // Limpiar datos actuales
            this.classes = [];
            this.trainingData = {};
            
            // Cargar datos del modelo
            this.classes = [...modelData.classes];
            this.currentModelName = modelData.name || 'modelo_importado';
            
            // Cargar imágenes
            this.trainingData = {};
            this.classes.forEach(className => {
                this.trainingData[className] = [];
                if (modelData.trainingData && modelData.trainingData[className]) {
                    modelData.trainingData[className].forEach(imgData => {
                        this.trainingData[className].push({
                            url: imgData.dataUrl,
                            timestamp: imgData.timestamp || Date.now()
                        });
                    });
                }
            });

            this.updateClassSelector();
            this.renderClasses();
            this.updateDatasetInfo();
            this.renderClassImages();
            
            this.showMessage(`Modelo "${modelData.name}" importado con ${this.getTotalImages()} imágenes!`, 'success');

        } catch (error) {
            console.error('Error importando modelo:', error);
            this.showMessage('Error importando modelo: ' + error.message, 'error');
        }
        
        event.target.value = '';
    }

    getSavedModels() {
        return JSON.parse(localStorage.getItem('microbit_savedModels') || '{}');
    }

    loadSavedModels() {
        const savedModels = this.getSavedModels();
        const container = document.getElementById('saved-models');
        container.innerHTML = '';

        if (Object.keys(savedModels).length === 0) {
            container.innerHTML = '<p style="color: #666; font-style: italic;">No hay modelos guardados</p>';
            return;
        }

        Object.entries(savedModels).forEach(([name, data]) => {
            const modelCard = document.createElement('div');
            modelCard.className = 'model-card';
            modelCard.innerHTML = `
                <strong>${name}</strong><br>
                <small>Clases: ${data.classes?.length || 0} | Imágenes: ${data.totalImages || 0}</small><br>
                <div style="margin-top: 0.5rem;">
                    <button onclick="app.loadModel('${name}')" class="btn-neon" style="font-size: 0.7rem; padding: 0.25rem 0.5rem;">Cargar</button>
                    <button onclick="app.deleteModel('${name}')" style="background: #dc3545; color: white; border: none; border-radius: 3px; padding: 0.25rem 0.5rem; font-size: 0.7rem; cursor: pointer;">Eliminar</button>
                </div>
            `;
            container.appendChild(modelCard);
        });
    }

    deleteModel(modelName) {
        if (confirm(`¿Eliminar el modelo "${modelName}"?`)) {
            const savedModels = this.getSavedModels();
            delete savedModels[modelName];
            localStorage.setItem('microbit_savedModels', JSON.stringify(savedModels));
            this.loadSavedModels();
            this.showMessage(`Modelo "${modelName}" eliminado`, 'success');
        }
    }

    // ========== GESTIÓN DE CLASES ==========

    addClass() {
        const input = document.getElementById('classNameInput');
        const className = input.value.trim();
        
        if (!className) {
            this.showMessage('Ingresa un nombre para la clase', 'error');
            return;
        }
        
        if (this.classes.includes(className)) {
            this.showMessage('Ya existe una clase con ese nombre', 'error');
            return;
        }
        
        this.classes.push(className);
        this.trainingData[className] = [];
        
        input.value = '';
        this.updateClassSelector();
        this.renderClasses();
        this.updateDatasetInfo();
        
        this.showMessage(`Clase "${className}" agregada`, 'success');
    }

    removeClass(className) {
        if (confirm(`¿Eliminar la clase "${className}" y todas sus imágenes?`)) {
            this.classes = this.classes.filter(c => c !== className);
            delete this.trainingData[className];
            
            this.updateClassSelector();
            this.renderClasses();
            this.updateDatasetInfo();
            this.renderClassImages();
            
            this.showMessage(`Clase "${className}" eliminada`, 'success');
        }
    }

    renderClasses() {
        const container = document.getElementById('classes-container');
        container.innerHTML = '';

        if (this.classes.length === 0) {
            container.innerHTML = '<p style="color: #666; font-style: italic;">No hay clases creadas</p>';
            return;
        }

        this.classes.forEach(className => {
            const classCard = document.createElement('div');
            classCard.className = 'class-card';
            const imageCount = this.trainingData[className] ? this.trainingData[className].length : 0;
            classCard.innerHTML = `
                <strong>${className}</strong><br>
                <small>${imageCount} imágenes</small><br>
                <button onclick="app.removeClass('${className}')" style="background: #dc3545; color: white; border: none; border-radius: 3px; padding: 0.25rem 0.5rem; font-size: 0.7rem; cursor: pointer; margin-top: 0.5rem;">Eliminar</button>
            `;
            container.appendChild(classCard);
        });
    }

    updateClassSelector() {
        const selector = document.getElementById('classSelector');
        selector.innerHTML = '<option value="">Selecciona una clase</option>';
        
        this.classes.forEach(className => {
            const option = document.createElement('option');
            option.value = className;
            option.textContent = className;
            selector.appendChild(option);
        });
    }

    // ========== CÁMARA Y CAPTURA ==========

    async startCamera() {
        try {
            if (this.currentStream) {
                this.stopCamera();
            }

            const constraints = {
                video: {
                    facingMode: this.currentFacingMode,
                    width: { ideal: 640 },
                    height: { ideal: 480 }
                }
            };

            this.currentStream = await navigator.mediaDevices.getUserMedia(constraints);
            
            const video = document.getElementById('cameraView');
            video.srcObject = this.currentStream;
            video.style.display = 'block';
            
            document.getElementById('captureImage').disabled = false;
            document.getElementById('switchCamera').style.display = 'inline-block';
            
            this.showMessage('Cámara iniciada', 'success');
            
        } catch (error) {
            console.error('Error accediendo a la cámara:', error);
            this.showMessage('Error accediendo a la cámara: ' + error.message, 'error');
        }
    }

    stopCamera() {
        if (this.currentStream) {
            this.currentStream.getTracks().forEach(track => track.stop());
            this.currentStream = null;
        }
        
        const video = document.getElementById('cameraView');
        video.style.display = 'none';
        document.getElementById('captureImage').disabled = true;
        document.getElementById('switchCamera').style.display = 'none';
    }

    switchCamera() {
        this.currentFacingMode = this.currentFacingMode === 'environment' ? 'user' : 'environment';
        this.startCamera();
    }

    captureImage() {
        const classSelector = document.getElementById('classSelector');
        const selectedClass = classSelector.value;
        
        if (!selectedClass) {
            this.showMessage('Selecciona una clase primero', 'error');
            return;
        }

        const video = document.getElementById('cameraView');
        const canvas = document.getElementById('captureCanvas');
        const context = canvas.getContext('2d');

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0);

        canvas.toBlob((blob) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                this.addImageToClass(selectedClass, e.target.result);
            };
            reader.readAsDataURL(blob);
        }, 'image/jpeg', 0.8);
    }

    handleImageUpload(event) {
        const classSelector = document.getElementById('classSelector');
        const selectedClass = classSelector.value;
        
        if (!selectedClass) {
            this.showMessage('Selecciona una clase primero', 'error');
            return;
        }

        const files = Array.from(event.target.files);
        let processed = 0;

        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                this.addImageToClass(selectedClass, e.target.result);
                processed++;
                if (processed === files.length) {
                    this.showMessage(`${files.length} imágenes agregadas a "${selectedClass}"`, 'success');
                }
            };
            reader.readAsDataURL(file);
        });

        event.target.value = '';
    }

    addImageToClass(className, imageUrl) {
        if (!this.trainingData[className]) {
            this.trainingData[className] = [];
        }

        this.trainingData[className].push({
            url: imageUrl,
            timestamp: Date.now()
        });

        this.renderClasses();
        this.renderClassImages();
        this.updateDatasetInfo();
        this.updateClassProgress();
    }

    updateClassProgress() {
        const progressDiv = document.getElementById('classProgress');
        progressDiv.innerHTML = '<h4>Progreso por Clase:</h4>';

        this.classes.forEach(className => {
            const count = this.trainingData[className] ? this.trainingData[className].length : 0;
            const percentage = Math.min((count / this.minImagesPerClass) * 100, 100);
            
            const progressItem = document.createElement('div');
            progressItem.style.marginBottom = '1rem';
            progressItem.innerHTML = `
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
                    <span><strong>${className}</strong></span>
                    <span>${count}/${this.minImagesPerClass}</span>
                </div>
                <div style="background: #e0e0e0; height: 8px; border-radius: 4px;">
                    <div style="background: ${percentage >= 100 ? '#28a745' : '#007bff'}; height: 100%; width: ${percentage}%; border-radius: 4px; transition: width 0.3s;"></div>
                </div>
            `;
            progressDiv.appendChild(progressItem);
        });
    }

    renderClassImages() {
        const container = document.getElementById('class-images-container');
        container.innerHTML = '';

        if (this.classes.length === 0) {
            container.innerHTML = '<p style="color: #666;">No hay clases creadas</p>';
            return;
        }

        this.classes.forEach(className => {
            const images = this.trainingData[className] || [];
            
            const classDiv = document.createElement('div');
            classDiv.className = 'class-images';
            classDiv.innerHTML = `
                <h4 style="color: #0077ff; margin-bottom: 0.5rem;">${className} (${images.length} imágenes)</h4>
            `;

            const imagesGrid = document.createElement('div');
            imagesGrid.className = 'images-grid';

            images.forEach((imageData, index) => {
                const imageItem = document.createElement('div');
                imageItem.className = 'image-item';
                imageItem.innerHTML = `
                    <img src="${imageData.url}" alt="${className} ${index}">
                    <button class="delete-image" onclick="app.removeImage('${className}', ${index})">&times;</button>
                `;
                imagesGrid.appendChild(imageItem);
            });

            classDiv.appendChild(imagesGrid);
            container.appendChild(classDiv);
        });
    }

    removeImage(className, index) {
        if (this.trainingData[className]) {
            this.trainingData[className].splice(index, 1);
            this.renderClasses();
            this.renderClassImages();
            this.updateDatasetInfo();
            this.updateClassProgress();
        }
    }

    // ========== ENTRENAMIENTO ==========

    updateDatasetInfo() {
        const infoDiv = document.getElementById('dataset-info');
        const totalImages = this.getTotalImages();
        const canTrain = this.classes.length >= 2 && this.classes.every(className => 
            (this.trainingData[className] || []).length >= this.minImagesPerClass
        );

        infoDiv.innerHTML = `
            <div style="background: #f8f9fa; padding: 1rem; border-radius: 8px;">
                <strong>Estado del Dataset:</strong><br>
                • Clases: ${this.classes.length}<br>
                • Total de imágenes: ${totalImages}<br>
                • Mínimo requerido: ${this.minImagesPerClass} imágenes por clase<br>
                <div style="color: ${canTrain ? '#28a745' : '#dc3545'}; font-weight: bold; margin-top: 0.5rem;">
                    ${canTrain ? '✅ Listo para entrenar' : '❌ Necesita más datos'}
                </div>
            </div>
        `;

        document.getElementById('trainModel').disabled = !canTrain || this.isTraining;
    }

    getTotalImages() {
        return Object.values(this.trainingData).reduce((total, images) => total + images.length, 0);
    }

    async trainModel() {
        if (this.isTraining) return;
        
        this.isTraining = true;
        const trainBtn = document.getElementById('trainModel');
        const statusDiv = document.getElementById('training-status');
        
        trainBtn.disabled = true;
        trainBtn.textContent = '🏋️ Entrenando...';
        
        try {
            statusDiv.innerHTML = '<div class="success-message">Iniciando entrenamiento...</div>';
            
            // Crear un modelo simple de clasificación
            this.model = tf.sequential({
                layers: [
                    tf.layers.dense({
                        inputShape: [224 * 224 * 3],
                        units: 128,
                        activation: 'relu'
                    }),
                    tf.layers.dropout({ rate: 0.2 }),
                    tf.layers.dense({
                        units: 64,
                        activation: 'relu'
                    }),
                    tf.layers.dropout({ rate: 0.2 }),
                    tf.layers.dense({
                        units: this.classes.length,
                        activation: 'softmax'
                    })
                ]
            });

            this.model.compile({
                optimizer: 'adam',
                loss: 'categoricalCrossentropy',
                metrics: ['accuracy']
            });

            statusDiv.innerHTML = '<div class="success-message">Preparando datos de entrenamiento...</div>';
            
            // Preparar datos de entrenamiento
            const { xs, ys } = await this.prepareTrainingData();
            
            statusDiv.innerHTML = '<div class="success-message">Entrenando modelo...</div>';
            
            // Entrenar el modelo
            await this.model.fit(xs, ys, {
                epochs: 10,
                batchSize: 32,
                validationSplit: 0.2,
                callbacks: {
                    onEpochEnd: (epoch, logs) => {
                        statusDiv.innerHTML = `
                            <div class="success-message">
                                Época ${epoch + 1}/10<br>
                                Precisión: ${(logs.acc * 100).toFixed(1)}%<br>
                                Pérdida: ${logs.loss.toFixed(4)}
                            </div>
                        `;
                    }
                }
            });

            xs.dispose();
            ys.dispose();

            statusDiv.innerHTML = '<div class="success-message">✅ ¡Modelo entrenado exitosamente!</div>';
            document.getElementById('startPrediction').disabled = false;
            
        } catch (error) {
            console.error('Error entrenando modelo:', error);
            statusDiv.innerHTML = `<div class="error-message">Error entrenando modelo: ${error.message}</div>`;
        } finally {
            this.isTraining = false;
            trainBtn.disabled = false;
            trainBtn.textContent = '🚀 Entrenar Modelo';
        }
    }

    async prepareTrainingData() {
        const images = [];
        const labels = [];

        for (let classIndex = 0; classIndex < this.classes.length; classIndex++) {
            const className = this.classes[classIndex];
            const classImages = this.trainingData[className] || [];

            for (const imageData of classImages) {
                const img = new Image();
                img.src = imageData.url;
                await new Promise(resolve => {
                    img.onload = resolve;
                });

                const canvas = document.createElement('canvas');
                canvas.width = 224;
                canvas.height = 224;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, 224, 224);

                const tensor = tf.browser.fromPixels(canvas).toFloat().div(255.0);
                images.push(tensor.flatten());

                const label = tf.oneHot([classIndex], this.classes.length);
                labels.push(label.flatten());
            }
        }

        const xs = tf.stack(images);
        const ys = tf.stack(labels);

        // Limpiar tensores intermedios
        images.forEach(tensor => tensor.dispose());
        labels.forEach(tensor => tensor.dispose());

        return { xs, ys };
    }

    resetData() {
        this.classes = [];
        this.trainingData = {};
        this.model = null;
        this.currentModelName = '';

        this.stopCamera();
        this.stopPrediction();

        this.updateClassSelector();
        this.renderClasses();
        this.renderClassImages();
        this.updateDatasetInfo();

        document.getElementById('training-status').innerHTML = '';
        document.getElementById('startPrediction').disabled = true;
        
        this.showMessage('Datos reiniciados', 'success');
    }

    // ========== BLUETOOTH MICRO:BIT ==========

    async connectMicrobit() {
        try {
            const statusDiv = document.getElementById('connection-status');
            const infoDiv = document.getElementById('bluetooth-info');
            
            statusDiv.innerHTML = 'Buscando micro:bit...';
            statusDiv.className = 'bluetooth-status';
            
            if (!navigator.bluetooth) {
                throw new Error('Bluetooth no soportado. Usa Chrome o Edge.');
            }

            this.bluetoothDevice = await navigator.bluetooth.requestDevice({
                filters: [
                    { namePrefix: 'BBC micro:bit' }
                ],
                optionalServices: ['6e400001-b5a3-f393-e0a9-e50e24dcca9e']
            });

            statusDiv.innerHTML = `Conectando a ${this.bluetoothDevice.name}...`;

            this.bluetoothDevice.addEventListener('gattserverdisconnected', () => {
                this.onBluetoothDisconnected();
            });

            this.bluetoothServer = await this.bluetoothDevice.gatt.connect();
            this.bluetoothService = await this.bluetoothServer.getPrimaryService('6e400001-b5a3-f393-e0a9-e50e24dcca9e');
            this.bluetoothCharacteristic = await this.bluetoothService.getCharacteristic('6e400002-b5a3-f393-e0a9-e50e24dcca9e');

            statusDiv.innerHTML = `✅ Conectado a ${this.bluetoothDevice.name}`;
            statusDiv.className = 'bluetooth-status bluetooth-connected';
            
            infoDiv.innerHTML = `
                <div class="success-message">
                    <strong>Dispositivo:</strong> ${this.bluetoothDevice.name}<br>
                    <strong>Estado:</strong> Conectado y listo para recibir predicciones
                </div>
            `;

            document.getElementById('testBluetooth').style.display = 'inline-block';

        } catch (error) {
            console.error('Error conectando Bluetooth:', error);
            const statusDiv = document.getElementById('connection-status');
            statusDiv.innerHTML = `❌ Error: ${error.message}`;
            statusDiv.className = 'bluetooth-status bluetooth-disconnected';
            
            this.showMessage('Error conectando micro:bit: ' + error.message, 'error');
        }
    }

    onBluetoothDisconnected() {
        const statusDiv = document.getElementById('connection-status');
        statusDiv.innerHTML = '❌ Desconectado';
        statusDiv.className = 'bluetooth-status bluetooth-disconnected';
        
        document.getElementById('bluetooth-info').innerHTML = 
            '<div class="warning-message">Dispositivo desconectado</div>';
        
        document.getElementById('testBluetooth').style.display = 'none';
        
        this.bluetoothDevice = null;
        this.bluetoothServer = null;
        this.bluetoothService = null;
        this.bluetoothCharacteristic = null;
    }

    async testBluetooth() {
        if (!this.bluetoothCharacteristic) {
            this.showMessage('No hay conexión Bluetooth activa', 'error');
            return;
        }

        try {
            const testMessage = 'TEST';
            const encoder = new TextEncoder();
            await this.bluetoothCharacteristic.writeValue(encoder.encode(testMessage));
            
            this.showMessage('✅ Test Bluetooth exitoso', 'success');
        } catch (error) {
            console.error('Error en test Bluetooth:', error);
            this.showMessage('Error en test Bluetooth: ' + error.message, 'error');
        }
    }

    async sendPredictionToMicrobit(predictionResults) {
        if (!this.bluetoothCharacteristic) return;

        try {
            const maxIndex = predictionResults.indexOf(Math.max(...predictionResults));
            const predictedClass = this.classes[maxIndex];
            const confidence = predictionResults[maxIndex];

            // Enviar índice de la clase predicha
            const message = `${maxIndex}`;
            const encoder = new TextEncoder();
            await this.bluetoothCharacteristic.writeValue(encoder.encode(message));

            console.log(`Enviado a micro:bit: Clase ${predictedClass} (índice ${maxIndex}), confianza: ${confidence.toFixed(2)}`);

        } catch (error) {
            console.error('Error enviando a micro:bit:', error);
        }
    }

    // ========== PREDICCIÓN ==========

    async startPrediction() {
        if (!this.model) {
            this.showMessage('Primero entrena un modelo', 'error');
            return;
        }

        this.isPredicting = true;
        const startBtn = document.getElementById('startPrediction');
        const stopBtn = document.getElementById('stopPrediction');
        
        startBtn.disabled = true;
        stopBtn.disabled = false;

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    facingMode: 'environment',
                    width: { ideal: 640 },
                    height: { ideal: 480 }
                } 
            });
            
            this.predictionStream = stream;
            const video = document.getElementById('predictionCamera');
            video.srcObject = stream;
            video.style.display = 'block';
            
            // Iniciar loop de predicción
            this.predictionLoop();
            
        } catch (error) {
            console.error('Error iniciando predicción:', error);
            this.showMessage('Error accediendo a la cámara: ' + error.message, 'error');
            this.stopPrediction();
        }
    }

    async predictionLoop() {
        if (!this.isPredicting) return;

        try {
            await this.makePrediction();
            
            if (this.isPredicting) {
                setTimeout(() => this.predictionLoop(), 1000); // 1 FPS
            }
        } catch (error) {
            console.error('Error en prediction loop:', error);
            if (this.isPredicting) {
                setTimeout(() => this.predictionLoop(), 2000);
            }
        }
    }

    async makePrediction() {
        const video = document.getElementById('predictionCamera');
        const canvas = document.getElementById('predictionCanvas');
        const context = canvas.getContext('2d');

        if (!video.videoWidth || video.videoWidth === 0) return;

        canvas.width = 224;
        canvas.height = 224;
        context.drawImage(video, 0, 0, 224, 224);

        try {
            const tensor = tf.browser.fromPixels(canvas)
                .toFloat()
                .div(255.0)
                .flatten()
                .expandDims(0);

            const prediction = this.model.predict(tensor);
            const results = await prediction.data();
            
            this.displayPrediction(Array.from(results));
            this.sendPredictionToMicrobit(Array.from(results));
            
            tensor.dispose();
            prediction.dispose();
            
        } catch (error) {
            console.error('Error en predicción:', error);
        }
    }

    displayPrediction(results) {
        const outputDiv = document.getElementById('prediction-output');
        const confidenceDiv = document.getElementById('confidence-bars');
        
        let maxConfidence = 0;
        let predictedClass = '';
        let confidenceHtml = '';
        
        results.forEach((confidence, index) => {
            const className = this.classes[index];
            const percentage = (confidence * 100).toFixed(1);
            
            if (confidence > maxConfidence) {
                maxConfidence = confidence;
                predictedClass = className;
            }
            
            confidenceHtml += `
                <div style="margin: 10px 0;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
                        <span><strong>${className}</strong></span>
                        <span>${percentage}%</span>
                    </div>
                    <div style="background: #e0e0e0; height: 8px; border-radius: 4px;">
                        <div class="confidence-bar" style="width: ${percentage}%; background: ${confidence === maxConfidence ? '#28a745' : '#007bff'};"></div>
                    </div>
                </div>
            `;
        });
        
        const predictionHtml = `
            <div class="prediction-result">
                <h4 style="color: #0077ff;">🔮 Predicción: ${predictedClass}</h4>
                <p><strong>Confianza:</strong> ${(maxConfidence * 100).toFixed(1)}%</p>
                <small style="color: #666;">${new Date().toLocaleTimeString()}</small>
            </div>
        `;
        
        outputDiv.innerHTML = predictionHtml;
        confidenceDiv.innerHTML = confidenceHtml;
    }

    stopPrediction() {
        this.isPredicting = false;
        
        const startBtn = document.getElementById('startPrediction');
        const stopBtn = document.getElementById('stopPrediction');
        startBtn.disabled = false;
        stopBtn.disabled = true;

        if (this.predictionStream) {
            this.predictionStream.getTracks().forEach(track => track.stop());
            this.predictionStream = null;
        }
        
        const video = document.getElementById('predictionCamera');
        video.style.display = 'none';
        
        document.getElementById('prediction-output').innerHTML = '<p style="color: #666;">Predicción detenida</p>';
        document.getElementById('confidence-bars').innerHTML = '';
    }

    // ========== UTILIDADES ==========

    showMessage(message, type = 'info') {
        const className = type === 'error' ? 'error-message' : 
                         type === 'success' ? 'success-message' : 
                         'warning-message';
        
        const div = document.createElement('div');
        div.className = className;
        div.textContent = message;
        div.style.position = 'fixed';
        div.style.top = '20px';
        div.style.right = '20px';
        div.style.zIndex = '1000';
        div.style.maxWidth = '300px';
        
        document.body.appendChild(div);
        
        setTimeout(() => {
            if (div.parentNode) {
                div.parentNode.removeChild(div);
            }
        }, 4000);
    }

    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = e => reject(e);
            reader.readAsText(file);
        });
    }
}

// Inicializar la aplicación
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new MicrobitImageTrainer();
});