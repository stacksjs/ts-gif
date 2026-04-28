# Creating GIFs

The `Writer` class provides complete control over GIF creation, including animated GIFs with multiple frames, custom palettes, and transparency.

## Basic GIF Creation

```typescript
import { Writer } from 'ts-gif'
import { writeFileSync } from 'node:fs'

// Allocate buffer for output
const buffer = Buffer.alloc(1024 * 1024)

// Create writer with dimensions and options
const writer = new Writer(buffer, 100, 100, {
  palette: [0x000000, 0xFFFFFF, 0xFF0000, 0x00FF00],
  loop: 0
})

// Add a frame
const pixels = new Uint8Array(100 * 100)
pixels.fill(1) // Fill with white (palette index 1)

writer.addFrame(0, 0, 100, 100, pixels)

// Finalize and get output size
const size = writer.end()

// Write to file
writeFileSync('output.gif', buffer.subarray(0, size))
```

## Writer Options

### WriterOptions Interface

```typescript
interface WriterOptions {
  // Global color palette (array of RGB values)
  palette?: number[]

  // Animation loop count (0 = forever, null = no loop)
  loop?: number | null

  // Background color palette index
  background?: number
}
```

### Setting Up the Writer

```typescript
// Minimal setup (requires local palettes per frame)
const writer = new Writer(buffer, width, height)

// With global palette
const writer = new Writer(buffer, width, height, {
  palette: [0x000000, 0xFFFFFF, 0xFF0000, 0x00FF00]
})

// Full options
const writer = new Writer(buffer, width, height, {
  palette: generatePalette(256),
  loop: 0,
  background: 0
})
```

## Adding Frames

### addFrame Method

```typescript
writer.addFrame(
  x: number,        // X position
  y: number,        // Y position
  width: number,    // Frame width
  height: number,   // Frame height
  pixels: Uint8Array,  // Pixel data (palette indices)
  options?: FrameOptions
)
```

### Frame Options

```typescript
interface FrameOptions {
  // Local color palette (overrides global)
  palette?: number[]

  // Frame delay in 10ms units (100 = 1 second)
  delay?: number

  // Transparency palette index
  transparent?: number | null

  // Disposal method (0-3)
  disposal?: number
}
```

### Frame Examples

```typescript
// Basic frame
writer.addFrame(0, 0, 100, 100, pixels)

// Frame with delay
writer.addFrame(0, 0, 100, 100, pixels, {
  delay: 50 // 500ms
})

// Frame with transparency
writer.addFrame(0, 0, 100, 100, pixels, {
  delay: 50,
  transparent: 0, // Index 0 is transparent
  disposal: 2     // Clear to background
})

// Frame with local palette
writer.addFrame(0, 0, 100, 100, pixels, {
  palette: customPalette, // Different colors for this frame
  delay: 50
})
```

## Creating Animated GIFs

### Simple Animation

```typescript
import { Writer } from 'ts-gif'

const width = 50
const height = 50
const buffer = Buffer.alloc(512 * 1024)

const palette = [
  0x000000, // Black
  0xFF0000, // Red
  0x00FF00, // Green
  0x0000FF, // Blue
]

const writer = new Writer(buffer, width, height, {
  palette,
  loop: 0 // Loop forever
})

// Create frames for color cycling
const pixels = new Uint8Array(width * height)

for (let color = 1; color <= 3; color++) {
  pixels.fill(color)
  writer.addFrame(0, 0, width, height, pixels, {
    delay: 100, // 1 second per frame
    disposal: 2
  })
}

const size = writer.end()
```

### Bouncing Ball Animation

```typescript
import { Writer } from 'ts-gif'

const width = 100
const height = 100
const ballRadius = 10
const frameCount = 20

const palette = [
  0xFFFFFF, // White background
  0xFF0000, // Red ball
]

const buffer = Buffer.alloc(1024 * 1024)
const writer = new Writer(buffer, width, height, {
  palette,
  loop: 0
})

for (let frame = 0; frame < frameCount; frame++) {
  const pixels = new Uint8Array(width * height)
  pixels.fill(0) // White background

  // Calculate ball position
  const progress = frame / frameCount
  const ballY = Math.sin(progress * Math.PI) * (height - 2 * ballRadius) + ballRadius
  const ballX = width / 2

  // Draw ball
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = x - ballX
      const dy = y - ballY
      if (dx * dx + dy * dy <= ballRadius * ballRadius) {
        pixels[y * width + x] = 1 // Red
      }
    }
  }

  writer.addFrame(0, 0, width, height, pixels, {
    delay: 5, // 50ms per frame
    disposal: 2
  })
}

const size = writer.end()
```

## Color Palettes

### Palette Requirements

- Must be a power of 2 (2, 4, 8, 16, 32, 64, 128, or 256 colors)
- Values are RGB in 0xRRGGBB format
- Maximum 256 colors

### Generating a Grayscale Palette

```typescript
function grayscalePalette(levels: number): number[] {
  // levels must be power of 2
  const palette: number[] = []
  for (let i = 0; i < levels; i++) {
    const gray = Math.floor((i / (levels - 1)) * 255)
    palette.push((gray << 16) | (gray << 8) | gray)
  }
  return palette
}

const palette = grayscalePalette(256)
```

### Generating a Web-Safe Palette

```typescript
function webSafePalette(): number[] {
  const palette: number[] = []
  const steps = [0x00, 0x33, 0x66, 0x99, 0xCC, 0xFF]

  for (const r of steps) {
    for (const g of steps) {
      for (const b of steps) {
        palette.push((r << 16) | (g << 8) | b)
      }
    }
  }

  // Pad to 256 colors (power of 2)
  while (palette.length < 256) {
    palette.push(0x000000)
  }

  return palette
}
```

## Transparency

### Setting Transparent Color

```typescript
// Use palette index 0 as transparent
writer.addFrame(0, 0, width, height, pixels, {
  transparent: 0,
  disposal: 2 // Important: clear to background
})
```

### Creating Transparent Areas

```typescript
const transparentIndex = 0
const opaqueColor = 1

const pixels = new Uint8Array(width * height)

for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    // Create checkerboard pattern with transparency
    if ((x + y) % 2 === 0) {
      pixels[y * width + x] = transparentIndex
    } else {
      pixels[y * width + x] = opaqueColor
    }
  }
}

writer.addFrame(0, 0, width, height, pixels, {
  transparent: transparentIndex,
  disposal: 2
})
```

## Buffer Management

### Getting Output

```typescript
// Get the output buffer
const outputBuffer = writer.getOutputBuffer()

// Get current position (bytes written)
const position = writer.getOutputBufferPosition()

// Get only the written portion
const gifData = outputBuffer.subarray(0, position)
```

### Buffer Size Estimation

```typescript
// Rough estimation for buffer size
function estimateBufferSize(
  width: number,
  height: number,
  frameCount: number
): number {
  // Base overhead + per-frame data
  const frameSize = width * height // Worst case: 1 byte per pixel
  const overhead = 1024 // Headers, palettes, etc.
  return overhead + frameSize * frameCount * 1.5 // 1.5x for LZW overhead
}
```

## API Reference

### Writer Class

```typescript
class Writer {
  constructor(
    buffer: Buffer,
    width: number,
    height: number,
    options?: WriterOptions
  )

  addFrame(
    x: number,
    y: number,
    width: number,
    height: number,
    pixels: Uint8Array,
    options?: FrameOptions
  ): number

  end(): number

  getOutputBuffer(): Buffer
  setOutputBuffer(buffer: Buffer): void
  getOutputBufferPosition(): number
  setOutputBufferPosition(position: number): void
}
```
