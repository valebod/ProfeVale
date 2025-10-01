# Micro:bit Bluetooth Web Apps - AI Agent Instructions

This is a collection of web applications for controlling micro:bit devices via Bluetooth, focusing on educational robotics and AI integration.

## Project Architecture

**Main Entry Point**: `index` (HTML landing page) showcases available micro:bit apps
**Shared Styling**: `style.css` defines the neon-cyberpunk design system used across all apps
**App Structure**: Each app lives in its own directory (`AppMicrobit*`) with self-contained HTML/JS

### Core Components
- **Bluetooth Communication**: Uses Web Bluetooth API with Nordic UART Service (`6e400001-b5a3-f393-e0a9-e50e24dcca9e`)
- **Face Detection**: TensorFlow.js with MediaPipe Face Mesh for real-time facial analysis
- **Teachable Machine Integration**: Google's Teachable Machine models for custom AI classification

## Design System Patterns

**Neon Aesthetic**: All UI follows cyberpunk theme with:
- `.header-glow` - Glowing titles with `#39ff14` and `#00d2ff` shadows
- `.card-glass` - Semi-transparent cards with glassmorphism effect
- `.btn-neon` - Glowing buttons with hover animations
- `.param-grid` - Responsive grid for data visualization

**Color Palette**:
- Primary: `#39ff14` (neon green)
- Secondary: `#00d2ff` (cyan blue) 
- Background: `linear-gradient(135deg, #232946 0%, #3f2c6e 100%)`
- Accents: `#ff2e63` (for alerts/warnings)

## Micro:bit Integration Patterns

### Standard Bluetooth Connection
```javascript
// Pattern used in all apps - Nordic UART Service
const device = await navigator.bluetooth.requestDevice({
  filters: [{ namePrefix: "BBC micro:bit" }],
  optionalServices: ["6e400001-b5a3-f393-e0a9-e50e24dcca9e"]
});
const txChar = await service.getCharacteristic("6e400002-b5a3-f393-e0a9-e50e24dcca9e");
```

### Data Transmission Format
- **Simple Commands**: Single characters (U/D/L/R for arrows app)
- **Complex Data**: JSON strings or structured text for facial parameters
- **Error Handling**: Always check connection status before sending

## App-Specific Patterns

### AppMicrobitFlechas (Arrow Control)
- Editable command mapping via input fields
- Grid-based directional controls using Tailwind CSS
- Real-time command customization

### AppMicrobitRF (Face Recognition)
- **Facial Parameters**: 12 tracked values (x, y, z, yaw, pitch, roll, mouth, eyes, smile, visibility)
- **Parameter Display**: Responsive grid layout adapting from 3→4→6 columns
- **Camera Switching**: Toggle between front/back cameras
- **Performance**: 60fps face detection with canvas overlay

## Development Conventions

### File Organization
- Keep apps self-contained in separate directories
- Share common styles via root `style.css`
- Use descriptive Spanish naming for user-facing elements

### Responsive Design
- Mobile-first approach with CSS Grid
- Breakpoints: 600px, 900px for layout shifts
- Scale UI elements appropriately on small screens

### Error Handling
- Always provide user feedback for Bluetooth connection states
- Use Spanish language for all user messages
- Implement graceful degradation when APIs unavailable

## External Dependencies

### CDN Libraries (prefer these versions)
- **TensorFlow.js**: `@3.18.0` for face detection
- **Tailwind CSS**: Latest via CDN for utility classes
- **Teachable Machine**: Google's tmImage library

### Browser Requirements
- Chrome/Edge recommended (Web Bluetooth support)
- Camera and Bluetooth permissions required
- Modern JavaScript (async/await, TextEncoder)

## Key Implementation Notes

- Face detection runs at 60fps using `requestAnimationFrame`
- Bluetooth characteristic writes use `TextEncoder` for UTF-8 encoding
- CSS animations use hardware acceleration (`transform`, `box-shadow`)
- Responsive grids adapt parameter display to screen size
- All apps use Spanish language for accessibility in educational context