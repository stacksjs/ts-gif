import type { BunpressConfig } from 'bunpress'

const config: BunpressConfig = {
  name: 'ts-gif',
  description: 'A performant TypeScript implementation for reading, writing, and manipulating GIF images',
  url: 'https://ts-gif.netlify.app',

  theme: {
    primaryColor: '#7c3aed',
  },

  sidebar: [
    { text: 'Introduction', link: '/' },
    {
      text: 'Guide',
      items: [
        { text: 'Getting Started', link: '/guide/getting-started' },
        { text: 'Creating GIFs', link: '/guide/encoding' },
        { text: 'Reading GIFs', link: '/guide/decoding' },
      ],
    },
    { text: 'Configuration', link: '/config' },
    {
      text: 'Features',
      items: [
        { text: 'Frame Manipulation', link: '/features/frames' },
        { text: 'Color Palettes', link: '/features/palettes' },
        { text: 'Animation Control', link: '/features/animation' },
        { text: 'Optimization', link: '/features/optimization' },
      ],
    },
    {
      text: 'Advanced',
      items: [
        { text: 'LZW Compression', link: '/advanced/compression' },
        { text: 'Memory Management', link: '/advanced/memory' },
        { text: 'Streaming GIFs', link: '/advanced/streaming' },
        { text: 'Browser Support', link: '/advanced/browser' },
      ],
    },
  ],

  navbar: [
    { text: 'Guide', link: '/guide/getting-started' },
    { text: 'GitHub', link: 'https://github.com/stacksjs/ts-gif' },
  ],

  head: [
    ['link', { rel: 'icon', href: '/favicon.ico' }],
    ['meta', { name: 'og:title', content: 'ts-gif' }],
    ['meta', { name: 'og:description', content: 'A performant TypeScript GIF encoder and decoder' }],
  ],
}

export default config
