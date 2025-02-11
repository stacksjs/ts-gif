<p align="center"><img src=".github/art/cover.jpg" alt="Social Card of this repo"></p>

[![npm version][npm-version-src]][npm-version-href]
[![GitHub Actions][github-actions-src]][github-actions-href]
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
<!-- [![npm downloads][npm-downloads-src]][npm-downloads-href] -->
<!-- [![Codecov][codecov-src]][codecov-href] -->

# ts-ndarray

> A TypeScript library for working with n-dimensional arrays.

## Features

- **N-dimensional**: Create and manipulate n-dimensional arrays.
- **Multilinear** Bilinear and trilinear interpolation for ndarrays.
- **Images** Utilities to read an image into an ndarray.
- **Simple**: A simple API for working with n-dimensional arrays.
- **Fast**: Built with performance in mind.
- **Typed**: Written in TypeScript.

## Get Started

### Installation

```bash
npm install ts-ndarray
# bun i ts-ndarray
```

### Usage

```ts
import { NdArray } from 'ts-ndarray'
```

## Testing

```bash
bun test
```

## Changelog

Please see our [releases](https://github.com/stackjs/ts-ndarray/releases) page for more information on what has changed recently.

## Contributing

Please see [CONTRIBUTING](.github/CONTRIBUTING.md) for details.

## Community

For help, discussion about best practices, or any other conversation that would benefit from being searchable:

[Discussions on GitHub](https://github.com/stacksjs/ts-starter/discussions)

For casual chit-chat with others using this package:

[Join the Stacks Discord Server](https://discord.gg/stacksjs)

## Postcardware

Stacks OSS will always stay open-sourced, and we will always love to receive postcards from wherever Stacks is used! _And we also publish them on our website._

Our address: Stacks.js, 12665 Village Ln #2306, Playa Vista, CA 90094, United States 🌎

## Credits

- Thanks to [Mikola Lysenko](https://github.com/mikolalysenko) for the original [`ndarray`](https://github.com/scijs/ndarray) library, [`ndarray-linear-interpolate`](https://github.com/scijs/ndarray-linear-interpolate), [`ndarray-pack`](https://github.com/scijs/ndarray-pack), and [`get-pixels`](https://github.com/scijs/get-pixels).

## Sponsors

We would like to extend our thanks to the following sponsors for funding Stacks development. If you are interested in becoming a sponsor, please reach out to us.

- [JetBrains](https://www.jetbrains.com/)
- [The Solana Foundation](https://solana.com/)

## License

The MIT License (MIT). Please see [LICENSE](LICENSE.md) for more information.

Made with 💙

<!-- Badges -->
[npm-version-src]: https://img.shields.io/npm/v/ts-ndarray?style=flat-square
[npm-version-href]: https://npmjs.com/package/ts-ndarray
[github-actions-src]: https://img.shields.io/github/actions/workflow/status/stacksjs/ts-starter/ci.yml?style=flat-square&branch=main
[github-actions-href]: https://github.com/stacksjs/ts-starter/actions?query=workflow%3Aci

<!-- [codecov-src]: https://img.shields.io/codecov/c/gh/stacksjs/ts-starter/main?style=flat-square
[codecov-href]: https://codecov.io/gh/stacksjs/ts-starter -->
