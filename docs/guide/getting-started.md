# Getting Started

ts-gif is a TypeScript library for reading, writing, and manipulating GIF images. It provides full support for both GIF87a and GIF89a specifications.

## Installation

Install using your preferred package manager:

```bash
# Using bun (recommended)
bun add ts-gif

# Using npm
npm install ts-gif

# Using pnpm
pnpm add ts-gif

# Using yarn
yarn add ts-gif
```

## Quick Overview

ts-gif provides two main classes:

- **`Reader`** - For reading and decoding existing GIF files
- **`Writer`** - For creating new GIF images

## Basic Usage

### Reading a GIF

```typescript
import { Reader } from 'ts-gif'
import { readFileSync } from 'node:fs'

// Load GIF file
const buffer = readFileSync('animation.gif')
const reader = new Reader(buffer)

// Get basic info
console.log(`Width: ${reader.width}`)
console.log(`Height: ${reader.height}`)
console.log(`Frames: ${reader.numFrames()}`)
console.log(`Loop count: ${reader.getLoopCount()}`)

// Get frame information
for (let i = 0; i < reader.numFrames(); i++) {
  const frame = reader.frameInfo(i)
  console.log(`Frame ${i}: ${frame.width}x${frame.height} at (${frame.x}, ${frame.y})`)
  console.log(`  Delay: ${frame.delay}ms`)
  console.log(`  Disposal: ${frame.disposal}`)
}
```

### Creating a GIF

```typescript
import { Writer } from 'ts-gif'
import { writeFileSync } from 'node:fs'

// Define dimensions and palette
const width = 100
const height = 100

// Create a simple 4-color palette (power of 2)
const palette = [
  0x000000, // Black
  0xFF0000, // Red
  0x00FF00, // Green
  0x0000FF, // Blue
]

// Create buffer for output (should be large enough)
const buffer = Buffer.alloc(1024 * 1024) // 1MB

// Create writer
const writer = new Writer(buffer, width, height, {
  palette,
  loop: 0, // 0 = loop forever
})

// Create pixel data (palette indices)
const pixels = new Uint8Array(width * height)

// Frame 1: Red
pixels.fill(1)
writer.addFrame(0, 0, width, height, pixels, {
  delay: 50, // 500ms (in 10ms units)
})

// Frame 2: Green
pixels.fill(2)
writer.addFrame(0, 0, width, height, pixels, {
  delay: 50,
})

// Frame 3: Blue
pixels.fill(3)
writer.addFrame(0, 0, width, height, pixels, {
  delay: 50,
})

// Finalize
const outputSize = writer.end()

// Write to file
writeFileSync('output.gif', buffer.subarray(0, outputSize))
```

## Key Concepts

### Palette-Based Coloring

GIF uses indexed colors with a palette of up to 256 colors:

```typescript
// Palette is an array of RGB values (0xRRGGBB)
const palette = [
  0x000000, // Index 0: Black
  0xFFFFFF, // Index 1: White
  0xFF0000, // Index 2: Red
  0x00FF00, // Index 3: Green
]

// Pixel data uses palette indices
const pixels = new Uint8Array([
  0, 0, 1, 1,  // Row 1: Black, Black, White, White
  1, 1, 0, 0,  // Row 2: White, White, Black, Black
  2, 2, 3, 3,  // Row 3: Red, Red, Green, Green
  3, 3, 2, 2,  // Row 4: Green, Green, Red, Red
])
```

### Frame Disposal Methods

Control how frames are cleared between animations:

| Value | Name | Description |
|-------|------|-------------|
| 0 | No disposal | Leave frame in place |
| 1 | Do not dispose | Leave graphic in place |
| 2 | Restore to background | Clear to background color |
| 3 | Restore to previous | Restore previous frame |

### Animation Loops

Control how many times the animation repeats:

```typescript
// Loop forever
new Writer(buffer, width, height, { loop: 0 })

// Play once (no loop)
new Writer(buffer, width, height, { loop: null })

// Loop 3 times
new Writer(buffer, width, height, { loop: 3 })
```

## TypeScript Support

Full type definitions are included:

```typescript
import type { Frame, WriterOptions, FrameOptions } from 'ts-gif'

const options: WriterOptions = {
  palette: colors,
  loop: 0,
  background: 0,
}

const frameOptions: FrameOptions = {
  delay: 100,
  disposal: 2,
  transparent: null,
  palette: null, // Use global palette
}
```

## Next Steps

- Learn about [Creating GIFs](/guide/encoding) with advanced options
- Explore [Reading GIFs](/guide/decoding) to extract frames and metadata
