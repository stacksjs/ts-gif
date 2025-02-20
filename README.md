<p align="center"><img src=".github/art/cover.jpg" alt="Social Card of this repo"></p>

[![npm version][npm-version-src]][npm-version-href]
[![GitHub Actions][github-actions-src]][github-actions-href]
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
<!-- [![npm downloads][npm-downloads-src]][npm-downloads-href] -->
<!-- [![Codecov][codecov-src]][codecov-href] -->

# ts-gif

> A TypeScript library for reading, writing, and manipulating GIF images

## Features

- 🎨 **Complete GIF Support**: Full support for GIF87a and GIF89a specifications
- 🖼️ **Frame Management**: Create and manipulate multi-frame animated GIFs
- 🎯 **Precise Control**: Fine-grained control over frame delays, disposal methods, and transparency
- 🌈 **Color Tables**: Support for both global and local color palettes
- 🔄 **Animation**: Full control over animation loops and timing
- 💪 **Typed**: Written in TypeScript with full type safety
- ⚡ **Efficient**: Optimized for performance with minimal memory footprint
- 🧰 **Simple API**: Easy-to-use interface for both basic and advanced GIF operations

## Get Started

### Installation

```bash
npm install ts-gif
# bun i ts-gif
```

### Usage

```ts
import { Reader, Writer } from 'ts-gif'

// Reading a GIF
const reader = new Reader(buffer)
console.log(`Dimensions: ${reader.width}x${reader.height}`)
console.log(`Number of frames: ${reader.numFrames()}`)

// Writing a GIF
const writer = new Writer(buffer, width, height, {
  palette: globalPalette,
  loop: 0 // 0 = loop forever
})

// Add frames
writer.addFrame(0, 0, width, height, pixelData, {
  delay: 100, // 100ms delay
  disposal: 2, // Clear frame before next
  transparent: null
})

// Finalize the GIF
writer.end()
```

## Testing

```bash
bun test
```

## Changelog

Please see our [releases](https://github.com/stackjs/ts-gif/releases) page for more information on what has changed recently.

## Contributing

Please see [CONTRIBUTING](.github/CONTRIBUTING.md) for details.

## Community

For help, discussion about best practices, or any other conversation that would benefit from being searchable:

[Discussions on GitHub](https://github.com/stacksjs/ts-starter/discussions)

For casual chit-chat with others using this package:

[Join the Stacks Discord Server](https://discord.gg/stacksjs)

## Postcardware

“Software that is free, but hopes for a postcard.” We love receiving postcards from around the world showing where `ts-gif` is being used! We showcase them on our website too.

Our address: Stacks.js, 12665 Village Ln #2306, Playa Vista, CA 90094, United States 🌎

## Credits

Thanks to [Dean McNamee](https://github.com/deanm) for the original [`omggif`](https://github.com/deanm/omggif) library.

## Sponsors

We would like to extend our thanks to the following sponsors for funding Stacks development. If you are interested in becoming a sponsor, please reach out to us.

- [JetBrains](https://www.jetbrains.com/)
- [The Solana Foundation](https://solana.com/)

## License

The MIT License (MIT). Please see [LICENSE](LICENSE.md) for more information.

Made with 💙

<!-- Badges -->
[npm-version-src]: https://img.shields.io/npm/v/ts-gif?style=flat-square
[npm-version-href]: https://npmjs.com/package/ts-gif
[github-actions-src]: https://img.shields.io/github/actions/workflow/status/stacksjs/ts-starter/ci.yml?style=flat-square&branch=main
[github-actions-href]: https://github.com/stacksjs/ts-starter/actions?query=workflow%3Aci

<!-- [codecov-src]: https://img.shields.io/codecov/c/gh/stacksjs/ts-starter/main?style=flat-square
[codecov-href]: https://codecov.io/gh/stacksjs/ts-starter -->
