# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project
follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Because this library exists to make results reproducible, **any change to the
bytes, floats or integers produced for a given input is a breaking change and
requires a major version**, however small it looks.

## [Unreleased]

## [2.0.0] - 2026-09-17

### Breaking

- Inputs are validated. Seeds must be non-empty strings; `nonce`, `cursor`,
  `count`, `max`, `min`, hash-chain `count`/`index` and hash-series `nonce`
  must be safe integers or their canonical decimal string form (`"400"`).
  Calls that previously coerced or ignored bad input (`ints()` returned `[]`,
  a `NaN` nonce was hashed as the text `NaN`) now throw.
- `serverHash` is always derived from `serverSeed`. A supplied value is
  replaced rather than trusted.
- `Provable(...)(config)` no longer mutates `config`; `state()` and the
  emitted state are copies.
- `next(salt)` requires a non-empty `salt`.
- `HashChain` rejects `index` outside `[0, count - 1]` and non-integer `count`
  with clear errors instead of `RangeError: Invalid array length` or silent
  `undefined`.
- Requires Node.js 14.17 or later (`crypto.randomUUID`).

### Fixed

- A long-lived `Provable` instance reused its first nonce for every draw, so
  the emitted state did not reproduce the outcome it was recorded against.
  Each draw now opens a fresh byte stream for the current nonce, then advances
  it. Instances that were re-created from persisted state before every draw
  produce identical results before and after this fix.
- The nonce guard runs before state changes, so a failed draw leaves the
  instance untouched.
- `HashChain` count assertion checked the seed (copy-paste).
- `HashChain()` with no argument threw `TypeError`.
- LICENSE copyright holder was blank.

### Changed

- README rewritten to describe the actual algorithm (HMAC-SHA256, the
  `[min, min + max - 1]` range of `ints`, immutable `HashSeries`, no `new` on
  generator functions) and to add a verification recipe.
- Test suite pins the byte stream, float and integer conversions and the
  rotation formula with fixed vectors.
- Releases are cut with `npm version` and published from GitHub Actions on
  `v*` tags with npm provenance.

### Added

- `HashChain.generateHashChain(count, seed)`.
- `utils.toInteger`, `utils.assertSeed`, `utils.randomUUID`.
- `files` field so the published tarball ships only the library.

### Removed

- Runtime dependencies `lodash` and `uuid`.
- The `release` npm script.

## [1.0.1] - 2025-09-27

### Changed

- Nonce advances eagerly and is capped at `Number.MAX_SAFE_INTEGER`.
- Documentation and typo fixes.

## [1.0.0] - 2024-05-03

### Added

- `Provable`, `HashSeries`, `HashChain` and `utils`.

[Unreleased]: https://github.com/provableio/provable-core/compare/v2.0.0...HEAD
[2.0.0]: https://github.com/provableio/provable-core/compare/v1.0.1...v2.0.0
[1.0.1]: https://github.com/provableio/provable-core/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/provableio/provable-core/releases/tag/v1.0.0
