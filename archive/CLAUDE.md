# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

High-performance WebAssembly implementation of the Ukrainian **Kupyna (DSTU 7564:2014)** cryptographic hash algorithm. The C core compiles to WASM with SIMD optimizations; a Web Worker serves as an async compute layer for the main thread.

Supported hash sizes: **256-bit** (32 bytes), **384-bit** (48 bytes), **512-bit** (64 bytes).

## Commands

```bash
# Development
npm run dev          # Start Vite dev server (with COOP/COEP headers for SharedArrayBuffer)
npm run preview      # Preview production build

# Build
npm run build:wasm   # Compile C → WebAssembly via Emscripten (requires emcc on PATH)
npm run build:vite   # Bundle TypeScript with Vite
npm run build        # Full build: WASM + Vite

# Code quality
npm run type-check   # TypeScript type checking (no emit)
npm run lint         # ESLint
npm run format       # Prettier
```

No JavaScript test runner is configured. Type checking and linting serve as the automated verification layer for TypeScript code. Native C tests live in `native/test_compile.c` and `native/test_multiple.c`; compile them with GCC via the `native/Makefile`.

## Architecture

```
Main Thread (kupyna-client.ts)
    ↕ postMessage / Transferable ArrayBuffers
Web Worker (kupyna.worker.ts)
    ↕ ccall / cwrap
WASM Module (kupyna.js + kupyna.wasm)
    ← compiled from native/src/{kupyna.c, kupyna_tables.c}
```

### Key Layers

**`src/types/worker-messages.ts`** — Shared message protocol. All commands (`INIT`, `HASH`, `TERMINATE`) and responses (`INIT_SUCCESS`, `HASH_SUCCESS`, etc.) are typed here. Start here when changing the worker API.

**`src/worker/kupyna.worker.ts`** — Web Worker entry point. Implements a **Command Queue Pattern**: incoming commands are queued and drained only after WASM finishes loading, preventing initialization race conditions. Responses use Transferable Objects (zero-copy `ArrayBuffer` transfer).

**`src/wasm/kupyna-wasm.ts`** — Thin TypeScript wrapper around the Emscripten module. Exposes `hash()` (one-shot) and `hashStream()` (init/update/final). Handles WASM memory allocation/deallocation and data conversion.

**`src/lib/kupyna-client.ts`** — Main-thread-facing Promise API. Manages the Worker lifecycle, tracks in-flight requests by ID, and supports progress callbacks. Consumers only interact with this class.

**`src/types/kupyna-wasm.d.ts`** — Type definitions for the Emscripten-generated module (HEAP views, exported C functions, error codes).

### Native C (`native/`)

- `src/kupyna.c` — Core algorithm: state initialization, `kupyna_update`, `kupyna_final`, one-shot `kupyna_hash`.
- `src/kupyna_tables.c` — 16 KB pre-computed `subrowcol[8][256]` lookup table combining S-Box, row shift, and MDS column mix.
- `include/kupyna.h` — Public C API with opaque `KupynaCtx` and return codes.
- `CMakeLists.txt` — Emscripten build config: `-O3 -flto -msimd128`, 16 MB initial / 256 MB max WASM memory, exports `kupyna_*`, `malloc`, `free`.

### WASM Build

`scripts/build-wasm.sh` orchestrates the build:
1. Runs `emcmake cmake` + `emmake make` in `native/build-wasm/`.
2. Copies `kupyna.js` + `kupyna.wasm` to `public/wasm/`.

Output lands in `public/wasm/` (dev) and is served from `/assets/` after the Vite build.

### Deployment

CI/CD runs in `.github/workflows/deploy.yml` (GitHub Actions → GitHub Pages). The Vite base path is `/dstu7564-ts-worker/`. The dev/preview servers inject `Cross-Origin-Opener-Policy` and `Cross-Origin-Embedder-Policy` headers required for `SharedArrayBuffer`.
