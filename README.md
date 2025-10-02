# Micro:bit Bluetooth Web Apps – Profe Vale

Sitio web con aplicaciones web (PWA) para controlar y explorar micro:bit por Bluetooth, pensado para robótica educativa e introducción práctica a la IA en el aula.

## ¿Qué hay en este sitio?

- Landing principal (`index.html`) con acceso a todas las apps.
- Cada app está en su propia carpeta y es una PWA instalable:
  - `AppMicrobitFlechas`: Control remoto con flechas y comandos personalizables.
  - `AppMicrobitRF`: Reconocimiento facial (TensorFlow.js + MediaPipe) y envío de parámetros a micro:bit.
  - `AppMicrobitTeachable`: Usa modelos de Google Teachable Machine para clasificar y enviar la clase a micro:bit.
  - `AppMicrobitImageTrainer`: Entrenador de imágenes simple en el navegador + conexión Bluetooth.

Todas comparten la estética y estilos de `style.css` y muestran el encabezado con `LogoProfeVale.png`.

## Objetivo pedagógico

Dar a docentes y estudiantes un conjunto de herramientas sencillas para:
- Reflexionar sobre la IA y su impacto en el aula.
- Integrar visión por computadora y modelos simples en proyectos con micro:bit.
- Probar rápidamente ideas de robótica educativa usando Bluetooth (UART Nordic).

> Misión: “darles a todos la posibilidad de tener en un solo sitio herramientas para trabajar en el aula la reflexión sobre la IA y su integración con la robótica educativa con micro:bit”.

## Instalación como App (PWA)

- Recomendado en Chrome/Edge/Brave (Android) y Safari (iOS, mediante “Añadir a pantalla de inicio”).
- En móvil en vertical verás un bloque al final de cada página con el icono de la app y el botón “Instalar App”.
- Si el navegador soporta el evento `beforeinstallprompt`, se mostrará el diálogo nativo; en iOS se muestra una guía de “Añadir a pantalla de inicio”.
- Cada app tiene su propio `manifest.json` e `sw.js` para funcionar offline de forma básica.

## Conexión con micro:bit

- Web Bluetooth (UART Nordic: `6e400001-b5a3-f393-e0a9-e50e24dcca9e`).
- En las páginas encontrarás el botón “Conectar micro:bit” y ejemplos de código MakeCode para recibir comandos vía UART.
- Se usa `TextEncoder` para enviar texto codificado en UTF-8.

## Dependencias y versiones (CDN)

- TensorFlow.js y/o Teachable Machine (según la app)
- Tailwind/estilos utilitarios vía `style.css` del proyecto
- MediaPipe/FaceMesh en la app de Reconocimiento Facial

## Estructura de carpetas (resumen)

- `index.html` – Página principal con links a todas las apps (usar siempre enlaces a `index.html` para evitar 404 en GitHub Pages).
- `AppMicrobitFlechas/` – Control remoto por flechas.
- `AppMicrobitRF/` – Reconocimiento facial.
- `AppMicrobitTeachable/` – Teachable Machine + micro:bit.
- `AppMicrobitImageTrainer/` – Entrenador de imágenes + Bluetooth.
- `style.css` – Estilos compartidos (tema neón, glassmorphism, botones, grids responsivos).

## Diseño y accesibilidad

- Tema neón/cyberpunk con variantes responsivas para móviles.
- Idioma: Español en todos los mensajes de UI y ayuda.
- Bloque de instalación PWA al final de cada página, con el `icon.png` propio de esa app.

## Recomendaciones de uso

- Abrir en Chrome/Edge (Android) o Safari (iOS) y conceder permisos de Bluetooth/Cámara cuando se soliciten.
- Para evitar errores 404 en GitHub Pages, usa URLs completas que terminen en `index.html` al navegar a las apps.
- Si no aparece el botón de instalar, girar el teléfono a vertical o buscar el ícono de instalación en la barra del navegador.

## Créditos

- Proyecto educativo de Profe Vale.
- Iconografía y estética inspiradas en temas neon/cyberpunk.
- Gracias a la comunidad de micro:bit y a los proyectos de IA en la web por su aporte a la educación.