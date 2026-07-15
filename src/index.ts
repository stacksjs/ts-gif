import { Reader, readerLZWOutputIndexStream } from './reader'
import { Writer, writerOutputLZWCodeStream } from './writer'
import { optimize, reencode } from './optimize'

interface Gif {
  Reader: typeof Reader
  Writer: typeof Writer
  optimize: typeof optimize
  reencode: typeof reencode
}

const gif: Gif = {
  Reader,
  Writer,
  optimize,
  reencode,
}

export { Reader, readerLZWOutputIndexStream, Writer, writerOutputLZWCodeStream, optimize, reencode }
export type { OptimizeOptions } from './optimize'

export default gif
