# Reading GIFs

The `Reader` class provides complete access to GIF file data, including dimensions, frame information, color palettes, and pixel data.

## Basic Reading

```typescript
import { Reader } from 'ts-gif'
import { readFileSync } from 'node:fs'

// Load GIF file
const buffer = readFileSync('animation.gif')
const reader = new Reader(buffer)

// Access basic properties
console.log(`Width: ${reader.width}`)
console.log(`Height: ${reader.height}`)
console.log(`Number of frames: ${reader.numFrames()}`)
console.log(`Loop count: ${reader.getLoopCount()}`)
```

## Frame Information

### Get Frame Metadata

```typescript
import { Reader } from 'ts-gif'

const reader = new Reader(buffer)

for (let i = 0; i < reader.numFrames(); i++) {
  const frame = reader.frameInfo(i)

  console.log(`Frame ${i}:`)
  console.log(`  Position: (${frame.x}, ${frame.y})`)
  console.log(`  Size: ${frame.width}x${frame.height}`)
  console.log(`  Delay: ${frame.delay * 10}ms`)
  console.log(`  Disposal: ${frame.disposal}`)
  console.log(`  Transparent index: ${frame.transparent_index}`)
  console.log(`  Interlaced: ${frame.interlaced}`)
  console.log(`  Has local palette: ${frame.has_local_palette}`)
}
```

### Frame Interface

```typescript
interface Frame {
  x: number              // X position in canvas
  y: number              // Y position in canvas
  width: number          // Frame width
  height: number         // Frame height
  has_local_palette: boolean
  palette_offset: number | null
  palette_size: number | null
  data_offset: number    // Offset in buffer
  data_length: number    // Compressed data length
  transparent_index: number | null
  interlaced: boolean
  delay: number          // Delay in 10ms units
  disposal: number       // Disposal method (0-3)
}
```

## Decoding Pixel Data

### Decode to RGBA

```typescript
import { Reader } from 'ts-gif'

const reader = new Reader(buffer)

// Create buffer for pixel data
const width = reader.width
const height = reader.height
const pixels = new Uint8Array(width * height * 4) // RGBA

// Decode first frame
reader.decodeAndBlitFrameRGBA(0, pixels)

// Access pixel values
for (let i = 0; i < pixels.length; i += 4) {
  const r = pixels[i]
  const g = pixels[i + 1]
  const b = pixels[i + 2]
  const a = pixels[i + 3]

  // Process pixel...
}
```

### Decode to BGRA

For compatibility with certain graphics APIs:

```typescript
const pixels = new Uint8Array(width * height * 4)
reader.decodeAndBlitFrameBGRA(0, pixels)
// Pixel order: B, G, R, A
```

## Working with Animations

### Extract All Frames

```typescript
import { Reader } from 'ts-gif'
import { writeFileSync } from 'node:fs'

const reader = new Reader(buffer)
const width = reader.width
const height = reader.height
const frameCount = reader.numFrames()

// Canvas to accumulate frames (for disposal handling)
const canvas = new Uint8Array(width * height * 4)

const frames: { pixels: Uint8Array; delay: number }[] = []

for (let i = 0; i < frameCount; i++) {
  const frame = reader.frameInfo(i)
  const framePixels = new Uint8Array(width * height * 4)

  // Copy previous canvas state (for disposal method 3)
  const previousCanvas = new Uint8Array(canvas)

  // Decode current frame onto canvas
  reader.decodeAndBlitFrameRGBA(i, canvas)

  // Copy canvas to frame
  framePixels.set(canvas)

  frames.push({
    pixels: framePixels,
    delay: frame.delay * 10 // Convert to milliseconds
  })

  // Handle disposal
  if (frame.disposal === 2) {
    // Clear frame area to background
    for (let y = frame.y; y < frame.y + frame.height; y++) {
      for (let x = frame.x; x < frame.x + frame.width; x++) {
        const idx = (y * width + x) * 4
        canvas[idx] = 0
        canvas[idx + 1] = 0
        canvas[idx + 2] = 0
        canvas[idx + 3] = 0
      }
    }
  } else if (frame.disposal === 3) {
    // Restore previous canvas
    canvas.set(previousCanvas)
  }
}

console.log(`Extracted ${frames.length} frames`)
```

### Get Animation Duration

```typescript
function getAnimationDuration(reader: Reader): number {
  let totalMs = 0
  for (let i = 0; i < reader.numFrames(); i++) {
    const frame = reader.frameInfo(i)
    totalMs += frame.delay * 10
  }
  return totalMs
}

const duration = getAnimationDuration(reader)
console.log(`Animation duration: ${duration}ms`)
```

### Get Loop Information

```typescript
const loopCount = reader.getLoopCount()

if (loopCount === null) {
  console.log('No animation extension (single play)')
} else if (loopCount === 0) {
  console.log('Loops forever')
} else {
  console.log(`Loops ${loopCount} times`)
}
```

## Color Palette Information

### Access Global Palette

```typescript
const reader = new Reader(buffer)
const frame = reader.frameInfo(0)

if (!frame.has_local_palette && frame.palette_offset !== null) {
  // Global palette is being used
  const paletteSize = frame.palette_size || 256
  console.log(`Global palette with ${paletteSize} colors`)
}
```

### Check for Local Palette

```typescript
for (let i = 0; i < reader.numFrames(); i++) {
  const frame = reader.frameInfo(i)
  if (frame.has_local_palette) {
    console.log(`Frame ${i} has local palette with ${frame.palette_size} colors`)
  }
}
```

## Error Handling

```typescript
import { Reader } from 'ts-gif'

try {
  const reader = new Reader(buffer)

  if (reader.numFrames() === 0) {
    console.log('GIF has no frames')
    return
  }

  // Validate frame index
  const frameIndex = 5
  if (frameIndex >= reader.numFrames()) {
    console.log(`Invalid frame index: ${frameIndex}`)
    return
  }

  const frame = reader.frameInfo(frameIndex)
  // Process frame...

} catch (error) {
  if (error.message.includes('Invalid GIF')) {
    console.log('Not a valid GIF file')
  } else if (error.message.includes('Invalid block')) {
    console.log('GIF file is corrupted')
  } else {
    throw error
  }
}
```

## Converting to Canvas (Browser)

```typescript
import { Reader } from 'ts-gif'

async function gifToCanvas(
  buffer: Buffer,
  frameIndex: number
): Promise<HTMLCanvasElement> {
  const reader = new Reader(buffer)
  const width = reader.width
  const height = reader.height

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext('2d')!
  const imageData = ctx.createImageData(width, height)

  reader.decodeAndBlitFrameRGBA(frameIndex, new Uint8Array(imageData.data.buffer))
  ctx.putImageData(imageData, 0, 0)

  return canvas
}
```

## GIF Metadata Summary

```typescript
function getGifSummary(buffer: Buffer) {
  const reader = new Reader(buffer)

  return {
    width: reader.width,
    height: reader.height,
    frameCount: reader.numFrames(),
    loopCount: reader.getLoopCount(),
    totalDuration: (() => {
      let ms = 0
      for (let i = 0; i < reader.numFrames(); i++) {
        ms += reader.frameInfo(i).delay * 10
      }
      return ms
    })(),
    hasTransparency: (() => {
      for (let i = 0; i < reader.numFrames(); i++) {
        if (reader.frameInfo(i).transparent_index !== null) {
          return true
        }
      }
      return false
    })(),
  }
}

const summary = getGifSummary(buffer)
console.log(summary)
```

## API Reference

### Reader Class

```typescript
class Reader {
  constructor(buffer: Buffer)

  // Dimensions
  readonly width: number
  readonly height: number

  // Frame methods
  numFrames(): number
  getLoopCount(): number | null
  frameInfo(frameNum: number): Frame

  // Decoding
  decodeAndBlitFrameRGBA(frameNum: number, pixels: Uint8Array): void
  decodeAndBlitFrameBGRA(frameNum: number, pixels: Uint8Array): void
}
```

### Disposal Methods

| Value | Name | Behavior |
|-------|------|----------|
| 0 | No disposal specified | Decoder not required to take action |
| 1 | Do not dispose | Leave graphic in place |
| 2 | Restore to background | Clear to background color |
| 3 | Restore to previous | Restore what was there prior |
