#!/usr/bin/env bash
set -euo pipefail

if ! command -v emcc &>/dev/null; then
  echo "Error: emcc not found. Install Emscripten: https://emscripten.org/docs/getting_started/downloads.html"
  exit 1
fi

echo "Emscripten: $(emcc --version | head -n1)"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BUILD_DIR="$PROJECT_ROOT/native/build-wasm"
OUTPUT_DIR="$PROJECT_ROOT/public/wasm"

rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR" "$OUTPUT_DIR"

cd "$BUILD_DIR"

emcmake cmake "$PROJECT_ROOT/native" \
  -DCMAKE_BUILD_TYPE=Release \
  -DCMAKE_C_FLAGS="-DNDEBUG"

emmake make

if [ ! -f "kupyna.js" ] || [ ! -f "kupyna.wasm" ]; then
  echo "Error: output files not found"
  ls -la
  exit 1
fi

cp kupyna.js kupyna.wasm "$OUTPUT_DIR/"

echo "Built: $(du -h "$OUTPUT_DIR/kupyna.wasm" | cut -f1) kupyna.wasm  |  $(du -h "$OUTPUT_DIR/kupyna.js" | cut -f1) kupyna.js"
