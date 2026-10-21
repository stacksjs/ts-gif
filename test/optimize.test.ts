import { expect, test } from 'bun:test'
import { Buffer } from 'node:buffer'
import { Reader, Writer, reencode } from '../src'

function fixture(loop?: number): Buffer {
  const buffer = Buffer.alloc(8192)
  const writer = new Writer(buffer, 40, 30, { palette: Array.from({ length: 256 }, (_, i) => i * 0x010101), loop, background: 2 })
  writer.addFrame(5, 4, 2, 2, new Uint8Array([0,1,1,0]), { delay: 8, disposal: 2 })
  writer.addFrame(6, 5, 2, 2, new Uint8Array([1,0,0,1]), { delay: 12, disposal: 1 })
  writer.end()
  return buffer.subarray(0, writer.getOutputBufferPosition())
}

test('retains canvas size, finite looping, delays, disposal and decoded frames', () => {
  const input = fixture(3)
  const output = Buffer.from(reencode(input))
  const before = new Reader(input)
  const after = new Reader(output)
  expect(after.getWidth()).toBe(40)
  expect(after.getHeight()).toBe(30)
  expect(after.getLoopCount()).toBe(3)
  expect(after.numFrames()).toBe(2)
  for (let i = 0; i < 2; i++) {
    const a = Buffer.alloc(40 * 30 * 4)
    const b = Buffer.alloc(a.length)
    before.decodeAndBlitFrameRGBA(i, a)
    after.decodeAndBlitFrameRGBA(i, b)
    expect(b).toEqual(a)
    expect(after.frameInfo(i).delay).toBe(before.frameInfo(i).delay)
    expect(after.frameInfo(i).disposal).toBe(before.frameInfo(i).disposal)
  }
  const originalBackground = input.subarray(13 + input[11] * 3, 16 + input[11] * 3)
  expect(output.subarray(13 + output[11] * 3, 16 + output[11] * 3)).toEqual(originalBackground)
})

test('does not turn a play-once animation into an infinite loop', () => {
  expect(new Reader(Buffer.from(reencode(fixture()))).getLoopCount()).toBe(null)
})

test('deinterlaces source rows before emitting a non-interlaced frame', () => {
  const buffer = Buffer.alloc(8192)
  const writer = new Writer(buffer, 2, 8, { palette: [0, 0xFFFFFF] })
  const indices = new Uint8Array([0,0, 0,1, 1,0, 1,1, 0,1, 1,0, 1,1, 0,0])
  writer.addFrame(0, 0, 2, 8, indices)
  writer.end()
  const input = buffer.subarray(0, writer.getOutputBufferPosition())
  const before = new Reader(input)
  input[before.frameInfo(0).data_offset - 1] |= 0x40
  const original = new Reader(input)
  expect(original.frameInfo(0).interlaced).toBe(true)
  const result = new Reader(Buffer.from(reencode(input)))
  const a = Buffer.alloc(64)
  const b = Buffer.alloc(64)
  original.decodeAndBlitFrameRGBA(0, a)
  result.decodeAndBlitFrameRGBA(0, b)
  expect(b).toEqual(a)
})
