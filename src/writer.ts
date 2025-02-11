import type { Buffer } from 'node:buffer'
import type { FrameOptions, WriterOptions } from './types'

export class Writer {
  private buffer: Buffer
  private width: number
  private height: number
  private position: number = 0
  private ended: boolean = false
  private globalPalette: number[] | null

  constructor(buf: Buffer, width: number, height: number, options: WriterOptions = {}) {
    this.buffer = buf
    this.width = width
    this.height = height
    this.globalPalette = options.palette ?? null

    if (width <= 0 || height <= 0 || width > 65535 || height > 65535) {
      throw new Error('Width/Height invalid.')
    }

    this.writeHeader()
    this.writeLogicalScreenDescriptor(options)
    this.writeGlobalColorTable()
    this.writeNetscapeLoopingExtension(options.loop)
  }

  private checkPaletteAndNumColors(palette: number[]): number {
    const num_colors = palette.length

    if (num_colors < 2 || num_colors > 256 || num_colors & (num_colors - 1)) {
      throw new Error('Invalid code/color length, must be power of 2 and 2 .. 256.')
    }

    return num_colors
  }

  private writeHeader(): void {
    // Write GIF89a header
    this.buffer[this.position++] = 0x47 // G
    this.buffer[this.position++] = 0x49 // I
    this.buffer[this.position++] = 0x46 // F
    this.buffer[this.position++] = 0x38 // 8
    this.buffer[this.position++] = 0x39 // 9
    this.buffer[this.position++] = 0x61 // a
  }

  private writeLogicalScreenDescriptor(options: WriterOptions): void {
    let gp_num_colors_pow2 = 0
    let background = 0

    if (this.globalPalette !== null) {
      let gp_num_colors = this.checkPaletteAndNumColors(this.globalPalette)
      // eslint-disable-next-line no-cond-assign
      while (gp_num_colors >>= 1) ++gp_num_colors_pow2
      gp_num_colors = 1 << gp_num_colors_pow2
      --gp_num_colors_pow2

      if (options.background !== undefined) {
        background = options.background
        if (background >= gp_num_colors) {
          throw new Error('Background index out of range.')
        }
        // The GIF spec states that a background index of 0 should be ignored, so
        // this is probably a mistake and you really want to set it to another
        // slot in the palette.  But actually, in the end, most browsers, etc., end
        // up ignoring this almost completely (including for dispose background).
        if (background === 0) {
          throw new Error('Background index explicitly passed as 0.')
        }
      }
    }

    // Write Logical Screen Descriptor
    this.buffer[this.position++] = this.width & 0xFF
    this.buffer[this.position++] = this.width >> 8 & 0xFF
    this.buffer[this.position++] = this.height & 0xFF
    this.buffer[this.position++] = this.height >> 8 & 0xFF
    this.buffer[this.position++] = (this.globalPalette !== null ? 0x80 : 0) | gp_num_colors_pow2
    this.buffer[this.position++] = background
    this.buffer[this.position++] = 0 // Pixel aspect ratio (unused)
  }

  private writeGlobalColorTable(): void {
    if (this.globalPalette !== null) {
      for (let i = 0; i < this.globalPalette.length; ++i) {
        const rgb = this.globalPalette[i]
        this.buffer[this.position++] = rgb >> 16 & 0xFF
        this.buffer[this.position++] = rgb >> 8 & 0xFF
        this.buffer[this.position++] = rgb & 0xFF
      }
    }
  }

  private writeNetscapeLoopingExtension(loopCount: number | null | undefined): void {
    if (loopCount !== null && loopCount !== undefined) {
      if (loopCount < 0 || loopCount > 65535) {
        throw new Error('Loop count invalid.')
      }

      // Write Netscape Extension for looping
      this.buffer[this.position++] = 0x21 // Extension Introduction
      this.buffer[this.position++] = 0xFF // Application Extension Label
      this.buffer[this.position++] = 0x0B // Block Size

      // NETSCAPE2.0
      this.buffer[this.position++] = 0x4E // N
      this.buffer[this.position++] = 0x45 // E
      this.buffer[this.position++] = 0x54 // T
      this.buffer[this.position++] = 0x53 // S
      this.buffer[this.position++] = 0x43 // C
      this.buffer[this.position++] = 0x41 // A
      this.buffer[this.position++] = 0x50 // P
      this.buffer[this.position++] = 0x45 // E
      this.buffer[this.position++] = 0x32 // 2
      this.buffer[this.position++] = 0x2E // .
      this.buffer[this.position++] = 0x30 // 0

      // Sub-block
      this.buffer[this.position++] = 0x03 // Sub-block Size
      this.buffer[this.position++] = 0x01 // Loop Indicator
      this.buffer[this.position++] = loopCount & 0xFF // Loop Count (2 bytes)
      this.buffer[this.position++] = loopCount >> 8 & 0xFF
      this.buffer[this.position++] = 0x00 // Block Terminator
    }
  }

  public addFrame(
    x: number,
    y: number,
    width: number,
    height: number,
    indexedPixels: Uint8Array,
    options: FrameOptions = {},
  ): number {
    if (this.ended) {
      --this.position
      this.ended = false
    }

    if (x < 0 || y < 0 || x > 65535 || y > 65535) {
      throw new Error('x/y invalid.')
    }

    if (width <= 0 || height <= 0 || width > 65535 || height > 65535) {
      throw new Error('Width/Height invalid.')
    }

    if (indexedPixels.length < width * height) {
      throw new Error('Not enough pixels for the frame size.')
    }

    const usingLocalPalette = options.palette !== undefined && options.palette !== null
    const palette = usingLocalPalette ? options.palette! : this.globalPalette

    if (!palette) {
      throw new Error('Must supply either a local or global palette.')
    }

    let numColors = this.checkPaletteAndNumColors(palette)

    // Compute the min_code_size (power of 2)
    let minCodeSize = 0
    // eslint-disable-next-line no-cond-assign
    while (numColors >>= 1) ++minCodeSize
    numColors = 1 << minCodeSize

    const delay = options.delay ?? 0
    // From the spec:
    //     0 -   No disposal specified. The decoder is
    //           not required to take any action.
    //     1 -   Do not dispose. The graphic is to be left
    //           in place.
    //     2 -   Restore to background color. The area used by the
    //           graphic must be restored to the background color.
    //     3 -   Restore to previous. The decoder is required to
    //           restore the area overwritten by the graphic with
    //           what was there prior to rendering the graphic.
    //  4-7 -    To be defined.
    // NOTE(deanm): Dispose background doesn't really work, apparently most
    // browsers ignore the background palette index and clear to transparency.
    const disposal = options.disposal ?? 0

    if (disposal < 0 || disposal > 3) {
      throw new Error('Disposal out of range.')
    }

    let useTransparency = false
    let transparentIndex = 0

    if (options.transparent !== undefined && options.transparent !== null) {
      useTransparency = true
      transparentIndex = options.transparent
      if (transparentIndex < 0 || transparentIndex >= numColors) {
        throw new Error('Transparent color index.')
      }
    }

    // Write Graphics Control Extension if needed
    if (disposal !== 0 || useTransparency || delay !== 0) {
      this.buffer[this.position++] = 0x21 // Extension Introducer
      this.buffer[this.position++] = 0xF9 // Graphics Control Label
      this.buffer[this.position++] = 4 // Byte Size
      this.buffer[this.position++] = disposal << 2 | (useTransparency ? 1 : 0)
      this.buffer[this.position++] = delay & 0xFF
      this.buffer[this.position++] = delay >> 8 & 0xFF
      this.buffer[this.position++] = transparentIndex
      this.buffer[this.position++] = 0 // Block Terminator
    }

    // Write Image Descriptor
    this.buffer[this.position++] = 0x2C // Image Separator
    this.buffer[this.position++] = x & 0xFF
    this.buffer[this.position++] = x >> 8 & 0xFF
    this.buffer[this.position++] = y & 0xFF
    this.buffer[this.position++] = y >> 8 & 0xFF
    this.buffer[this.position++] = width & 0xFF
    this.buffer[this.position++] = width >> 8 & 0xFF
    this.buffer[this.position++] = height & 0xFF
    this.buffer[this.position++] = height >> 8 & 0xFF
    this.buffer[this.position++] = usingLocalPalette ? (0x80 | (minCodeSize - 1)) : 0

    // Write Local Color Table
    if (usingLocalPalette) {
      for (let i = 0; i < palette.length; ++i) {
        const rgb = palette[i]
        this.buffer[this.position++] = rgb >> 16 & 0xFF
        this.buffer[this.position++] = rgb >> 8 & 0xFF
        this.buffer[this.position++] = rgb & 0xFF
      }
    }

    this.position = writerOutputLZWCodeStream(
      this.buffer,
      this.position,
      minCodeSize < 2 ? 2 : minCodeSize,
      indexedPixels,
    )

    return this.position
  }

  public end(): number {
    if (!this.ended) {
      this.buffer[this.position++] = 0x3B // Trailer Marker
      this.ended = true
    }
    return this.position
  }

  public getOutputBuffer(): Buffer {
    return this.buffer
  }

  public setOutputBuffer(buffer: Buffer): void {
    this.buffer = buffer
  }

  public getOutputBufferPosition(): number {
    return this.position
  }

  public setOutputBufferPosition(position: number): void {
    this.position = position
  }
}

// Main compression routine, palette indexes -> LZW code stream.
// |index_stream| must have at least one entry.
export function writerOutputLZWCodeStream(buf: Buffer, p: number, min_code_size: number, index_stream: Uint8Array): number {
  buf[p++] = min_code_size
  let cur_subblock = p++ // Pointing at the length field.

  const clear_code = 1 << min_code_size
  const code_mask = clear_code - 1
  const eoi_code = clear_code + 1
  let next_code = eoi_code + 1

  let cur_code_size = min_code_size + 1 // Number of bits per code.
  let cur_shift = 0
  // We have at most 12-bit codes, so we should have to hold a max of 19
  // bits here (and then we would write out).
  let cur = 0

  function emit_bytes_to_buffer(bit_block_size: number) {
    while (cur_shift >= bit_block_size) {
      buf[p++] = cur & 0xFF
      cur >>= 8
      cur_shift -= 8

      if (p === cur_subblock + 256) { // Finished a subblock.
        buf[cur_subblock] = 255
        cur_subblock = p++
      }
    }
  }

  function emit_code(c: number) {
    cur |= c << cur_shift
    cur_shift += cur_code_size
    emit_bytes_to_buffer(8)
  }

  // I am not an expert on the topic, and I don't want to write a thesis.
  // However, it is good to outline here the basic algorithm and the few data
  // structures and optimizations here that make this implementation fast.
  // The basic idea behind LZW is to build a table of previously seen runs
  // addressed by a short id (herein called output code).  All data is
  // referenced by a code, which represents one or more values from the
  // original input stream.  All input bytes can be referenced as the same
  // value as an output code.  So if you didn't want any compression, you
  // could more or less just output the original bytes as codes (there are
  // some details to this, but it is the idea).  In order to achieve
  // compression, values greater then the input range (codes can be up to
  // 12-bit while input only 8-bit) represent a sequence of previously seen
  // inputs.  The decompressor is able to build the same mapping while
  // decoding, so there is always a shared common knowledge between the
  // encoding and decoder, which is also important for "timing" aspects like
  // how to handle variable bit width code encoding.
  //
  // One obvious but very important consequence of the table system is there
  // is always a unique id (at most 12-bits) to map the runs.  'A' might be
  // 4, then 'AA' might be 10, 'AAA' 11, 'AAAA' 12, etc.  This relationship
  // can be used for an efficient lookup strategy for the code mapping.  We
  // need to know if a run has been seen before, and be able to map that run
  // to the output code.  Since we start with known unique ids (input bytes),
  // and then from those build more unique ids (table entries), we can
  // continue this chain (almost like a linked list) to always have small
  // integer values that represent the current byte chains in the encoder.
  // This means instead of tracking the input bytes (AAAABCD) to know our
  // current state, we can track the table entry for AAAABC (it is guaranteed
  // to exist by the nature of the algorithm) and the next character D.
  // Therefor the tuple of (table_entry, byte) is guaranteed to also be
  // unique.  This allows us to create a simple lookup key for mapping input
  // sequences to codes (table indices) without having to store or search
  // any of the code sequences.  So if 'AAAA' has a table entry of 12, the
  // tuple of ('AAAA', K) for any input byte K will be unique, and can be our
  // key.  This leads to a integer value at most 20-bits, which can always
  // fit in an SMI value and be used as a fast sparse array / object key.

  // Output code for the current contents of the index buffer.
  let ib_code = index_stream[0] & code_mask // Load first input index.
  let code_table: Record<number, number> = {} // Key'd on our 20-bit "tuple".

  emit_code(clear_code) // Spec says first code should be a clear code.

  // First index already loaded, process the rest of the stream.
  for (let i = 1, il = index_stream.length; i < il; ++i) {
    const k = index_stream[i] & code_mask
    const cur_key = ib_code << 8 | k // (prev, k) unique tuple.
    const cur_code = code_table[cur_key] // buffer + k.

    // Check if we have to create a new code table entry.
    if (cur_code === undefined) { // We don't have buffer + k.
      // Emit index buffer (without k).
      // This is an inline version of emit_code, because this is the core
      // writing routine of the compressor (and V8 cannot inline emit_code
      // because it is a closure here in a different context).  Additionally
      // we can call emit_byte_to_buffer less often, because we can have
      // 30-bits (from our 31-bit signed SMI), and we know our codes will only
      // be 12-bits, so can safely have 18-bits there without overflow.
      // emit_code(ib_code);
      cur |= ib_code << cur_shift
      cur_shift += cur_code_size

      while (cur_shift >= 8) {
        buf[p++] = cur & 0xFF
        cur >>= 8
        cur_shift -= 8

        if (p === cur_subblock + 256) { // Finished a subblock.
          buf[cur_subblock] = 255
          cur_subblock = p++
        }
      }

      if (next_code === 4096) { // Table full, need a clear.
        emit_code(clear_code)
        next_code = eoi_code + 1
        cur_code_size = min_code_size + 1
        code_table = {}
      }
      else {
        // Table not full, insert a new entry.
        // Increase our variable bit code sizes if necessary.  This is a bit
        // tricky as it is based on "timing" between the encoding and
        // decoder.  From the encoders perspective this should happen after
        // we've already emitted the index buffer and are about to create the
        // first table entry that would overflow our current code bit size.
        if (next_code >= (1 << cur_code_size))
          ++cur_code_size
        code_table[cur_key] = next_code++ // Insert into code table.
      }

      ib_code = k // Index buffer to single input k.
    }
    else {
      ib_code = cur_code // Index buffer to sequence in code table.
    }
  }

  emit_code(ib_code) // There will still be something in the index buffer.
  emit_code(eoi_code) // End Of Information.

  // Flush / finalize the sub-blocks stream to the buffer.
  emit_bytes_to_buffer(1)

  // Finish the sub-blocks, writing out any unfinished lengths and
  // terminating with a sub-block of length 0.  If we have already started
  // but not yet used a sub-block it can just become the terminator.
  if (cur_subblock + 1 === p) { // Started but unused.
    buf[cur_subblock] = 0
  }
  else { // Started and used, write length and additional terminator block.
    buf[cur_subblock] = p - cur_subblock - 1
    buf[p++] = 0
  }

  return p
}
