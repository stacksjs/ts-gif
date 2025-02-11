import { Reader, readerLZWOutputIndexStream } from './reader'
import { Writer, writerOutputLZWCodeStream } from './writer'

interface Gif {
  Reader: typeof Reader
  Writer: typeof Writer
}

const gif: Gif = {
  Reader,
  Writer,
}

export { Reader, readerLZWOutputIndexStream, Writer, writerOutputLZWCodeStream }

export default gif
