/**
 * PROFE VALE - RECONOCIMIENTO FACIAL CON MICRO:BIT - VERSIÓN LEDS
 * ===============================================================
 * 
 * Este programa recibe datos de reconocimiento facial por Bluetooth
 * desde la aplicación web de Profe Vale y controla LEDs según la detección.
 * 
 * DATOS RECIBIDOS (19 caracteres):
 * - Posición X (0-99): caracteres 0-1
 * - Posición Y (0-99): caracteres 2-3  
 * - Distancia Z (0-99): caracteres 4-5
 * - Giro horizontal/Yaw (0-99): caracteres 6-7
 * - Giro vertical/Pitch (0-99): caracteres 8-9
 * - Apertura boca (0-99): caracteres 10-11
 * - Ojo izquierdo (0-99): caracteres 12-13
 * - Ojo derecho (0-99): caracteres 14-15
 * - Inclinación lateral/Roll (0-9): carácter 16
 * - Sonrisa (0-9): carácter 17
 * - Rostro visible (0-1): carácter 18
 * 
 * VERSIONES DISPONIBLES:
 * - main.ts: Control básico con LEDs (este archivo)
 * - ProfeVale_MotoresCabeza.ts: Control de cabeza robótica con servos
 * 
 * Proyecto optimizado: https://makecode.microbit.org/S47739-58068-55967-69537
 * 
 * Variables globales
 */
let rostroVisible = 0
let sonrisa = 0
let giro = 0
let ojoDerecho = 0
let ojoIzquierdo = 0
let boca = 0
let inclinacion = 0
let guinada = 0
let distancia = 0
let posY = 0
let posX = 0
let datos = ""

// ORDEN CRÍTICO: bluetooth.startUartService() PRIMERO
bluetooth.startUartService()
basic.showIcon(IconNames.Square)

// Eventos de conexión
bluetooth.onBluetoothConnected(function () {
    basic.showIcon(IconNames.Yes)
})
bluetooth.onBluetoothDisconnected(function () {
    basic.showIcon(IconNames.No)
})

// Recepción de datos (19 caracteres + NewLine)
bluetooth.onUartDataReceived(serial.delimiters(Delimiters.NewLine), function () {
    datos = bluetooth.uartReadUntil(serial.delimiters(Delimiters.NewLine))
    if (datos.length != 19) {
        return
    }
    posX = parseFloat(datos.substr(0, 2))
    posY = parseFloat(datos.substr(2, 2))
    distancia = parseFloat(datos.substr(4, 2))
    guinada = parseFloat(datos.substr(6, 2))
    inclinacion = parseFloat(datos.substr(8, 2))
    boca = parseFloat(datos.substr(10, 2))
    ojoIzquierdo = parseFloat(datos.substr(12, 2))
    ojoDerecho = parseFloat(datos.substr(14, 2))
    giro = parseFloat(datos.substr(16, 1))
    sonrisa = parseFloat(datos.substr(17, 1))
    rostroVisible = parseFloat(datos.substr(18, 1))
    led.plotBarGraph(
    guinada,
    99
    )
    if (rostroVisible == 0) {
        basic.showLeds(`
            . . . . .
            . . . . .
            . . # . .
            . . . . .
            . . . . .
            `)
        basic.pause(100)
    } else if (posX < 35) {
        basic.showArrow(ArrowNames.West)
        basic.pause(100)
    } else if (posX > 65) {
        basic.showArrow(ArrowNames.East)
        basic.pause(100)
    } else if (posY < 35) {
        basic.showArrow(ArrowNames.North)
        basic.pause(100)
    } else if (posY > 65) {
        basic.showArrow(ArrowNames.South)
        basic.pause(100)
    } else if (boca > 50) {
        basic.showIcon(IconNames.Surprised)
        basic.pause(100)
    } else if (ojoIzquierdo < 30) {
        basic.showLeds(`
            . . . . .
            . . . # #
            . . . . .
            . # # # .
            . . . . .
            `)
        basic.pause(100)
    } else if (distancia > 60) {
        basic.showIcon(IconNames.Happy)
        basic.pause(100)
    } else if (ojoDerecho < 30) {
        basic.showLeds(`
            . . . . .
            # # . . .
            . . . . .
            . # # # .
            . . . . .
            `)
        basic.pause(100)
    } else {
        basic.showIcon(IconNames.Chessboard)
        basic.pause(100)
    }
})