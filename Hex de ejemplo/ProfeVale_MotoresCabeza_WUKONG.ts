/**
 * PROFE VALE - CONTROL DE CABEZA ROBÓTICA CON MICRO:BIT + WUKONG
 * ==============================================================
 * 
 * Este programa permite controlar una cabeza robótica mediante reconocimiento facial
 * usando la app web de Profe Vale y conexión Bluetooth con placa WUKONG.
 * 
 * HARDWARE REQUERIDO:
 * - micro:bit v2 (recomendado) o v1.5
 * - Placa de expansión WUKONG
 * - 5 servomotores SG90 o similares
 * - Fuente de alimentación externa para servos (OBLIGATORIO)
 * 
 * CONEXIONES DE SERVOS EN WUKONG:
 * - S1: Servo cabeza arriba/abajo (pitch)
 * - S2: Servo cabeza izquierda/derecha (yaw) 
 * - S3: Servo boca (apertura)
 * - S4: Servo ojo izquierdo (parpadeo)
 * - S5: Servo ojo derecho (parpadeo)
 * 
 * IMPORTANTE - EXTENSIÓN WUKONG:
 * En MakeCode, debes agregar la extensión WUKONG:
 * 1. Clic en "Extensiones" (engranaje)
 * 2. Buscar "wukong" 
 * 3. Seleccionar la extensión oficial WUKONG
 * 
 * FUNCIONAMIENTO:
 * 1. La app web detecta rostros y envía datos por Bluetooth
 * 2. micro:bit recibe cadena de 19 caracteres con parámetros faciales
 * 3. Los servos se mueven según la posición y expresiones detectadas
 * 
 * Proyecto MakeCode: https://makecode.microbit.org/S47739-58068-55967-69537
 */

// Detecta conexión Bluetooth
bluetooth.onBluetoothConnected(function () {
    // muestra carita feliz al conectarse
    basic.showIcon(IconNames.Happy)
})

// Detecta desconexión Bluetooth
bluetooth.onBluetoothDisconnected(function () {
    // muestra ícono de desconexión
    basic.showIcon(IconNames.No)
})

/**
 * Variables para almacenar los datos recibidos por Bluetooth
 */
// Cuando se recibe un dato por UART terminado en salto de línea
bluetooth.onUartDataReceived(serial.delimiters(Delimiters.NewLine), function () {
    // Lee la cadena completa recibida
    cadenaRecibida = bluetooth.uartReadUntil(serial.delimiters(Delimiters.NewLine))
    
    // Parseo de los valores de la cadena (19 caracteres total)
    // Formato: XXYYZZHH PPBBLLRR GSV
    // XX = posición X (0-99)
    // YY = posición Y (0-99) 
    // ZZ = distancia Z (0-99)
    // HH = giro horizontal/yaw (0-99)
    // PP = giro vertical/pitch (0-99)
    // BB = apertura boca (0-99)
    // LL = ojo izquierdo (0-99)
    // RR = ojo derecho (0-99)
    // G = inclinación lateral/roll (0-9)
    // S = sonrisa (0-9)
    // V = rostro visible (0-1)
    
    valorX = parseFloat(cadenaRecibida.substr(0, 2))
    valorY = parseFloat(cadenaRecibida.substr(2, 2))
    valorZ = parseFloat(cadenaRecibida.substr(4, 2))
    giroHorizontal = parseFloat(cadenaRecibida.substr(6, 2))
    giroVertical = parseFloat(cadenaRecibida.substr(8, 2))
    valorBoca = parseFloat(cadenaRecibida.substr(10, 2))
    valorOjoIzquierdo = parseFloat(cadenaRecibida.substr(12, 2))
    valorOjoDerecho = parseFloat(cadenaRecibida.substr(14, 2))
    inclinacionLateral = parseFloat(cadenaRecibida.substr(16, 1))
    valorSonrisa = parseFloat(cadenaRecibida.substr(17, 1))
    rostroDetectado = parseFloat(cadenaRecibida.substr(18, 1))
    
    // Control de servomotores usando comandos WUKONG
    // IMPORTANTE: Estos comandos son específicos para WUKONG
    
    // Servo boca - mapea apertura de boca (0-90° a 0-50°)
    wuKong.servoAngle(wuKong.ServoTypeList.S1, Math.map(valorBoca, 0, 90, 0, 50))
    
    // Servo cabeza arriba/abajo - mapea pitch (10-90° a 180-0°)
    wuKong.servoAngle(wuKong.ServoTypeList.S2, Math.map(giroVertical, 10, 90, 180, 0))
    
    // Servo cabeza izquierda/derecha - mapea yaw (10-90° a 135-45°)
    wuKong.servoAngle(wuKong.ServoTypeList.S3, Math.map(giroHorizontal, 10, 90, 135, 45))
    
    // Servo ojo izquierdo - mapea parpadeo (10-60° a 135-33°)
    wuKong.servoAngle(wuKong.ServoTypeList.S4, Math.map(valorOjoIzquierdo, 10, 60, 135, 33))
    
    // Servo ojo derecho - mapea parpadeo (10-60° a 0-98°)
    wuKong.servoAngle(wuKong.ServoTypeList.S5, Math.map(valorOjoDerecho, 10, 60, 0, 98))
})

// Declaración de variables globales
let rostroDetectado = 0
let valorSonrisa = 0
let inclinacionLateral = 0
let valorOjoDerecho = 0
let valorOjoIzquierdo = 0
let valorBoca = 0
let giroVertical = 0
let giroHorizontal = 0
let valorZ = 0
let valorY = 0
let valorX = 0
let cadenaRecibida = ""

// Inicialización
// Muestra un cuadrado mientras espera conexión
basic.showIcon(IconNames.Square)

// Inicia servicio UART para recibir datos por Bluetooth
bluetooth.startUartService()