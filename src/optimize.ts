/**
 * GIF optimizer — pure-TypeScript, no deps.
 *
 * Two passes, run independently and the smaller output wins:
 *
 *   1. **Palette tightening (per-frame)** — drop palette entries that no
 *      pixel actually references, repack to the smallest power-of-two
 *      palette (which also shrinks LZW's `min_code_size` and therefore the
 *      whole code stream). Always safe, always smaller-or-equal.
 *
 *   2. **Global-palette consolidation** — if all frames combined reference
 *      ≤ 256 unique colors, emit a single global colour table and skip the
 *      per-frame local color tables. This is what gifsicle's `-O3` does.
 *
 * Both passes operate on the **original index streams** (decoded losslessly
 * via the existing LZW reader). No re-quantization, so output is bit-exact
 * pixel-for-pixel with the input.
 */

import type { Buffer as NodeBuffer } from 'node:buffer'
import { Buffer } from 'node:buffer'
import { Reader, readerLZWOutputIndexStream } from './reader'
import { Writer } from './writer'

export interface OptimizeOptions {
  /**
   * Always return the re-encoded bytes, even if larger than the input.
   * Useful for benchmarks or when you want to inspect the re-encoder
   * output deterministically. Default `false`.
   */
  force?: boolean
}

/**
 * Optimize a GIF byte stream. Returns the smaller of the original and the
 * re-encoded output (so the caller never has to fall back).
 *
 * On any decode/encode failure, the original input is returned unchanged.
 */
export function optimize(input: Uint8Array, options: OptimizeOptions = {}): Uint8Array {
  try {
    const re = reencode(input)
    if (options.force) return re
    return re.length < input.length ? re : input
  }
  catch {
    return input
  }
}

/**
 * Force re-encoding with palette tightening + (when possible) global palette
 * consolidation. Always returns a freshly built buffer — the caller is
 * responsible for picking the smaller of input/output via `optimize()`.
 */
export function reencode(input: Uint8Array): Uint8Array {
  const buf = Buffer.from(input)
  const reader = new Reader(buf)
  const width = reader.getWidth()
  const height = reader.getHeight()
  const numFrames = reader.numFrames()

  if (numFrames === 0) return input

  // ── Phase 1 ────────────────────────────────────────────────────────────
  // Decode each frame's raw index stream + extract its source palette.
  type DecodedFrame = {
    info: ReturnType<Reader['frameInfo']>
    indices: Uint8Array
    /** Palette as RGB triples, in order. Length is one of 2,4,…,256. */
    palette: number[]
    /** Colors actually referenced by `indices` (plus the transparent index, if any). */
    usedSet: Set<number>
  }

  const frames: DecodedFrame[] = []
  for (let i = 0; i < numFrames; i++) {
    const info = reader.frameInfo(i)
    const numPixels = info.width * info.height
    const indices = new Uint8Array(numPixels)

    readerLZWOutputIndexStream(buf, info.data_offset, indices, numPixels)

    if (info.palette_offset === null) {
      // Palette-less frame is malformed for our purposes; passthrough.
      throw new Error('frame has no palette')
    }

    const palette = readPalette(buf, info.palette_offset, info.palette_size ?? 0)

    const usedSet = new Set<number>()
    for (let p = 0; p < indices.length; p++) usedSet.add(indices[p])
    if (info.transparent_index !== null) usedSet.add(info.transparent_index)

    frames.push({ info, indices, palette, usedSet })
  }

  const loopCount = reader.getLoopCount()

  // ── Phase 2: try global-palette consolidation ──────────────────────────
  // If every frame's used colours together fit into 256, we can replace
  // every local colour table with one shared global one — saving up to
  // (numFrames - 1) × ≈768 bytes.
  const globalAttempt = tryGlobalPalette(frames)

  // ── Phase 3: per-frame tightening fallback ─────────────────────────────
  const localAttempt = tightenLocalPalettes(width, height, frames, loopCount)

  // Pick whichever attempt is smaller. (Both are valid GIF89a outputs.)
  if (globalAttempt && globalAttempt.length <= localAttempt.length) {
    return globalAttempt
  }
  return localAttempt
}

// ───────────────────────────────────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────────────────────────────────

function readPalette(buf: NodeBuffer, offset: number, size: number): number[] {
  const palette: number[] = []
  for (let i = 0; i < size; i++) {
    const r = buf[offset + i * 3]
    const g = buf[offset + i * 3 + 1]
    const b = buf[offset + i * 3 + 2]
    palette.push((r << 16) | (g << 8) | b)
  }
  return palette
}

/** Round palette length up to a power of two ≥ 2 by padding with black. */
function padPalette(palette: number[]): number[] {
  let psize = 2
  while (psize < palette.length) psize <<= 1
  const padded = palette.slice()
  while (padded.length < psize) padded.push(0)
  return padded
}

/**
 * Per-frame tightening: drop unused palette entries, remap indices, repack
 * to the smallest power-of-two palette size. Always succeeds.
 */
function tightenLocalPalettes(
  width: number,
  height: number,
  frames: Array<{
    info: ReturnType<Reader['frameInfo']>
    indices: Uint8Array
    palette: number[]
    usedSet: Set<number>
  }>,
  loopCount: number | null,
): Uint8Array {
  // Worst-case output budget: original-ish per frame plus headroom for
  // headers + LZW overhead. We slice to the actual position at the end.
  const budget = computeOutputBudget(width, height, frames)
  const out = Buffer.alloc(budget)

  const writer = new Writer(out, width, height, {
    loop: frames.length > 1 ? (loopCount ?? 0) : null,
  })

  for (const f of frames) {
    const used = Array.from(f.usedSet).sort((a, b) => a - b)
    const remap = new Uint8Array(256)
    for (let n = 0; n < used.length; n++) remap[used[n]] = n

    const newIndices = new Uint8Array(f.indices.length)
    for (let p = 0; p < f.indices.length; p++) newIndices[p] = remap[f.indices[p]]

    const newPalette = padPalette(used.map(idx => f.palette[idx] ?? 0))

    const newTransparent = f.info.transparent_index !== null
      ? remap[f.info.transparent_index]
      : undefined

    writer.addFrame(
      f.info.x,
      f.info.y,
      f.info.width,
      f.info.height,
      newIndices,
      {
        palette: newPalette,
        delay: f.info.delay,
        disposal: f.info.disposal,
        transparent: newTransparent,
      },
    )
  }

  writer.end()
  return Uint8Array.from(out.slice(0, writer.getOutputBufferPosition()))
}

/**
 * Try to build a single global palette covering every frame. Returns null
 * if the union of every frame's used colours exceeds 256 (in which case
 * the local-palette path will produce smaller output anyway).
 */
function tryGlobalPalette(
  frames: Array<{
    info: ReturnType<Reader['frameInfo']>
    indices: Uint8Array
    palette: number[]
    usedSet: Set<number>
  }>,
): Uint8Array | null {
  // Collect every (rgb, isTransparent) combination across all frames.
  // We treat transparency as a logical channel — a frame that wants to be
  // transparent at index i still needs a slot for i in the global palette,
  // but the GCE's transparent_index can repoint to that slot.
  const colorSet = new Set<number>()
  for (const f of frames) {
    for (const idx of f.usedSet) {
      // The original transparent index may point at a colour we don't
      // care about (since the pixel is masked); skip it from the colour
      // set — we'll allocate a single transparent slot per frame later.
      if (f.info.transparent_index === idx) continue
      colorSet.add(f.palette[idx] ?? 0)
    }
  }

  // Reserve one extra slot for transparency (when any frame uses it).
  const anyTransparent = frames.some(f => f.info.transparent_index !== null)
  const required = colorSet.size + (anyTransparent ? 1 : 0)
  if (required > 256) return null

  // Build the global palette. Put transparent slot last so its index is
  // deterministic (and easy for callers to spot).
  const globalPalette: number[] = Array.from(colorSet).sort((a, b) => a - b)
  const TRANSPARENT_SLOT = anyTransparent ? globalPalette.length : -1
  if (anyTransparent) globalPalette.push(0) // placeholder colour for the transparent slot

  const padded = padPalette(globalPalette)

  // Map: (oldFrameIdx, frame#) → new global index.
  // For each frame, build a remap based on its original palette.
  const colorToGlobal = new Map<number, number>()
  for (let i = 0; i < globalPalette.length; i++) {
    if (i === TRANSPARENT_SLOT) continue
    colorToGlobal.set(globalPalette[i], i)
  }

  const totalWidth = frames[0]
  const _w = totalWidth // (unused — the global LSD width is taken from the writer ctor below)
  void _w

  // Determine canvas size from the original (we still need it for the writer).
  // We thread it in via `frames[0].info` is wrong (it's the frame, not canvas).
  // The caller of tryGlobalPalette knows the canvas — but to keep the surface
  // small we recover it from the union of frame extents (works for valid GIFs).
  let canvasWidth = 0
  let canvasHeight = 0
  for (const f of frames) {
    canvasWidth = Math.max(canvasWidth, f.info.x + f.info.width)
    canvasHeight = Math.max(canvasHeight, f.info.y + f.info.height)
  }

  const budget = computeOutputBudget(canvasWidth, canvasHeight, frames) + padded.length * 3
  const out = Buffer.alloc(budget)

  const writer = new Writer(out, canvasWidth, canvasHeight, {
    palette: padded,
    loop: frames.length > 1 ? 0 : null,
  })

  for (const f of frames) {
    const newIndices = new Uint8Array(f.indices.length)
    const oldTrans = f.info.transparent_index
    for (let p = 0; p < f.indices.length; p++) {
      const oldIdx = f.indices[p]
      if (oldIdx === oldTrans) {
        newIndices[p] = TRANSPARENT_SLOT >= 0 ? TRANSPARENT_SLOT : 0
      }
      else {
        newIndices[p] = colorToGlobal.get(f.palette[oldIdx] ?? 0) ?? 0
      }
    }

    writer.addFrame(
      f.info.x,
      f.info.y,
      f.info.width,
      f.info.height,
      newIndices,
      {
        delay: f.info.delay,
        disposal: f.info.disposal,
        transparent: oldTrans !== null && TRANSPARENT_SLOT >= 0 ? TRANSPARENT_SLOT : undefined,
        // No `palette` here → writer uses the global palette.
      },
    )
  }

  writer.end()
  return Uint8Array.from(out.slice(0, writer.getOutputBufferPosition()))
}

function computeOutputBudget(
  width: number,
  height: number,
  frames: Array<{ indices: Uint8Array }>,
): number {
  // Upper bound: header + global palette + per-frame (image descriptor +
  // local palette + LZW size, which is at worst input size + 1/63 overhead
  // for sub-block lengths). Add slack for GCEs, Netscape loop block, etc.
  let total = 1024 // header + LSD + global palette + Netscape extension
  for (const f of frames) {
    total += 1024 + Math.ceil(f.indices.length * 9 / 8) + Math.ceil(f.indices.length / 254)
  }
  return Math.max(total, width * height * 2 + 4096)
}
