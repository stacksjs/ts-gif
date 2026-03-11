import { dts } from 'bun-plugin-dtsx'

async function build(): Promise<void> {
  await Bun.build({
    entrypoints: ['src/index.ts'],
    target: 'browser',
    outdir: './dist',
    plugins: [dts()],
  })
}

build()
