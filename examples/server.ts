// trigger this via `bun examples/server.ts`
import { Buffer } from 'node:buffer'
import fs from 'node:fs'
import gif from '../src/index'

// Needs to be large enough for the final full file size.  Can be any type of
// buffer that supports [] (an Array, Uint8Array, Node Buffer, etc).
const buf = Buffer.alloc(1024 * 1024)

function gen_static_global() {
  const gf = new gif.Writer(buf, 2, 2, { palette: [0xFF0000, 0x0000FF] })
  gf.addFrame(0, 0, 2, 2, [0, 1, 1, 0])
  return buf.slice(0, gf.end())
}

function gen_static_local() {
  const gf = new gif.Writer(buf, 2, 2)
  gf.addFrame(0, 0, 2, 2, [0, 1, 1, 0], { palette: [0xFF0000, 0x0000FF] })
  return buf.slice(0, gf.end())
}

function gen_anim() {
  // The loop parameter is the number of times to loop, or 0 for forever.
  // A value of 1 will play twice (first time, and then one loop time).
  // To play only once do not specify loop or pass null.
  const gf = new gif.Writer(buf, 2, 2, { loop: 1 })
  gf.addFrame(0, 0, 2, 2, [0, 1, 1, 0], { palette: [0xFF0000, 0x0000FF] })
  gf.addFrame(0, 0, 2, 2, [1, 0, 0, 1], {
    palette: [0xFF0000, 0x0000FF],
    delay: 10,
  }) // Delay in hundredths of a sec (100 = 1s).
  return buf.slice(0, gf.end())
}

function gen_gray_strip() {
  const gf = new gif.Writer(buf, 256, 1)
  const palette = []
  const indices = []
  for (let i = 0; i < 256; ++i) {
    palette.push(i << 16 | i << 8 | i)
    indices.push(i)
  }
  gf.addFrame(0, 0, 256, 1, indices, { palette })
  return buf.slice(0, gf.end())
}

// More than 8-bit color (via tiling of several frames).  Browsers seem to
// treat this as an animation though, with an enforced minimum time between
// frames which makes it animated instead of the intended static image.
function gen_color_strip() {
  const gf = new gif.Writer(buf, 256, 256, {
    palette: [0x000000, 0xFF0000],
    background: 1,
  })

  const indices = []
  for (let i = 0; i < 256; ++i) indices.push(i)

  for (let j = 0; j < 256; ++j) {
    const palette = []
    for (let i = 0; i < 256; ++i)
      palette.push(j << 16 | i << 8 | i)
    gf.addFrame(0, j, 256, 1, indices, { palette, disposal: 1 })
  }
  return buf.slice(0, gf.end())
}

// 1x1 white, generates the same as Google's 35 byte __utm.gif, except for some
// reason that I'm not sure of they set their background index to 255.
function gen_empty_white() {
  const gf = new gif.Writer(buf, 1, 1, { palette: [0xFFFFFF, 0x000000] })
  gf.addFrame(0, 0, 1, 1, [0])
  return buf.slice(0, gf.end())
}

// 1x1 transparent 43 bytes.
function gen_empty_trans() {
  const gf = new gif.Writer(buf, 1, 1, { palette: [0x000000, 0x000000] })
  gf.addFrame(0, 0, 1, 1, [0], { transparent: 0 })
  return buf.slice(0, gf.end())
}

// with lzw block of 256.
// see: https://github.com/deanm/gif/issues/5
function gen_block256() {
  const width = 4840
  const gf = new gif.Writer(buf, width, 1, {
    palette: [0x000000, 0x000000, 0x000000, 0x000000, 0x000000, 0x000000, 0x000000, 0x000000],
  })
  const stream = Array.from({ length: width })
  for (let i = 0; i < width; ++i) stream[i] = i & 0x7
  gf.addFrame(0, 0, width, 1, stream, { transparent: 0 })
  const data = buf.slice(0, gf.end())
  // Make sure it decodes.
  const gr = new gif.Reader(data)
  const fi0 = gr.frameInfo(0)
  /*
  console.log(fi0);
  console.log(buf.slice(fi0.data_offset, fi0.data_offset + fi0.data_length));
  */
  return data
}

fs.writeFileSync('./test_static_global_palette.gif', gen_static_global())
fs.writeFileSync('./test_static_local_palette.gif', gen_static_local())
fs.writeFileSync('./test_anim.gif', gen_anim())
fs.writeFileSync('./test_gray_strip.gif', gen_gray_strip())
fs.writeFileSync('./test_color_strip.gif', gen_color_strip())
fs.writeFileSync('./test_empty_white.gif', gen_empty_white())
fs.writeFileSync('./test_empty_trans.gif', gen_empty_trans())
fs.writeFileSync('./test_block256.gif', gen_block256())
