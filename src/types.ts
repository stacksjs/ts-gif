export interface WriterOptions {
  loop?: number
  palette?: number[]
  background?: number
}

export interface FrameOptions {
  palette?: number[]
  delay?: number
  disposal?: number
  transparent?: number
}

export interface Frame {
  x: number
  y: number
  width: number
  height: number
  has_local_palette: boolean
  palette_offset: number | null
  palette_size: number | null
  data_offset: number
  data_length: number
  transparent_index: number | null
  interlaced: boolean
  delay: number
  disposal: number
}
