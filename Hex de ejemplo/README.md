# 🤖 Archivos HEX para micro:bit - Profe Vale

Este directorio contiene los programas compilados (archivos .hex) para usar con las aplicaciones web de reconocimiento facial y control robótico.

## 📁 Archivos disponibles

### 🔹 `microbit-ValeProfe_ControlFacial_v2.hex`
**Programa básico de reconocimiento facial con LEDs**
- ✅ Compatible con cualquier micro:bit (v1.5, v2)
- 🔋 Sin hardware adicional requerido
- 📱 Funciona con la app web de Reconocimiento Facial
- 💡 Muestra patrones LED según detección facial

**Funciones:**
- Cuadrado: esperando conexión Bluetooth
- Cara feliz: conectado correctamente  
- Cara triste: desconectado
- Gráfico de barras: movimiento horizontal detectado
- Patrones animados: ojos cerrados/abiertos

---

### 🔹 `microbit-ProfeVale_MotoresCabeza.hex`
**Control de cabeza robótica con 5 servomotores** ⭐ NUEVO

- 🎯 **Hardware específico requerido**
- 🤖 Control completo de cabeza robótica
- 🎨 Movimientos realistas y expresiones
- 📡 Sincronizado con reconocimiento facial en tiempo real

**Hardware compatible:**
- ✅ **Placas con motor driver integrado** (tipo Motor:bit, Robotbit)
- ⚠️ **NO compatible con WUKONG** (ver nota abajo)
- 🔌 5 servomotores SG90 conectados a puertos S1-S5
- ⚡ Fuente externa recomendada para servos

**Conexiones de servos:**
- **S1:** Cabeza arriba/abajo (pitch)
- **S2:** Cabeza izquierda/derecha (yaw)  
- **S3:** Apertura de boca
- **S4:** Parpadeo ojo izquierdo
- **S5:** Parpadeo ojo derecho

---

## 📋 Código fuente disponible

### `main.ts` - Versión LEDs
Código fuente del programa básico con LEDs para micro:bit estándar.

### `ProfeVale_MotoresCabeza.ts` - Versión Robótica  
Código fuente del control de cabeza robótica con servomotores.

---

## 🔧 Instalación

1. **Conecta tu micro:bit** al ordenador via USB
2. **Descarga el archivo .hex** apropiado para tu proyecto
3. **Copia el archivo** a la unidad MICROBIT que aparece
4. **Espera** a que se copie y reinicie automáticamente
5. **Abre la app web** de Reconocimiento Facial
6. **Conecta vía Bluetooth** y ¡a experimentar!

---

## ⚠️ Nota importante sobre WUKONG

El archivo `microbit-ProfeVale_MotoresCabeza.hex` **NO es compatible** con placas **WUKONG** usadas en muchos colegios.

**¿Por qué?**
- WUKONG usa comandos diferentes para servomotores
- Las conexiones de pines son distintas
- Requiere extensión específica de WUKONG en MakeCode

**Para usar con WUKONG:**
- Necesitarías una **versión adaptada** del código
- Cambiar `motor.servo()` por comandos WUKONG
- Usar la extensión WUKONG en MakeCode
- Ajustar números de pines según WUKONG

💡 **¿Te gustaría una versión para WUKONG?** Contáctame a través de la página principal y podríamos crear una versión específica para las placas de tu colegio.

---

## 🔗 Enlaces útiles

- 🌐 [Proyecto en MakeCode](https://makecode.microbit.org/S47739-58068-55967-69537)
- 📱 [App Reconocimiento Facial](../AppMicrobitRF/)
- 🏠 [Página Principal Profe Vale](../)

---

**¡Experimenta, aprende y crea! 🚀**