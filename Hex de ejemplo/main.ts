// Programa micro:bit para Control Facial - Profe Vale
// IMPORTANTE: Este código DEBE ejecutarse exactamente en este orden

// 1. PRIMERO: Inicializar servicio UART Bluetooth
bluetooth.startUartService()
basic.showIcon(IconNames.Square)

// 2. Variables globales
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

// 3. Eventos de conexión/desconexión
bluetooth.onBluetoothConnected(function () {
    basic.showIcon(IconNames.Yes)
})

bluetooth.onBluetoothDisconnected(function () {
    basic.showIcon(IconNames.No)
})

// 4. Recepción de datos (paquete fijo de 19 caracteres + NewLine)
bluetooth.onUartDataReceived(serial.delimiters(Delimiters.NewLine), function () {
    music.play(music.tonePlayable(988, music.beat(BeatFraction.Sixteenth)), music.PlaybackMode.InBackground)
    datos = bluetooth.uartReadUntil(serial.delimiters(Delimiters.NewLine))
    
    if (datos.length != 19) {
        music.play(music.tonePlayable(262, music.beat(BeatFraction.Sixteenth)), music.PlaybackMode.InBackground)
        return
    }
    
    // Extraer parámetros del paquete de 19 caracteres
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
    
    // Demo: gráfico de barras con guiñada (0..99)
    led.plotBarGraph(guinada, 99)
    
    // Ejemplo de reacciones basadas en datos faciales
    if (rostroVisible == 0) {
        basic.clearScreen()
    } else if (posX < 35) {
        basic.showArrow(ArrowNames.West)
    } else if (posX > 65) {
        basic.showArrow(ArrowNames.East)
    } else if (posY < 35) {
        basic.showArrow(ArrowNames.North)
    } else if (posY > 65) {
        basic.showArrow(ArrowNames.South)
    } else if (boca > 50) {
        basic.showIcon(IconNames.Surprised)
    } else if (ojoIzquierdo < 30) {
        basic.showLeds(`
            . . . . .
            . . . # #
            . . . . .
            . # # # .
            . . . . .
            `)
    } else if (distancia > 60) {
        basic.showIcon(IconNames.Happy)
    } else if (ojoDerecho < 30) {
        basic.showLeds(`
            . . . . .
            # # . . .
            . . . . .
            . # # # .
            . . . . .
            `)
    } else {
        basic.showIcon(IconNames.Chessboard)
    }
})