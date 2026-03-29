#!/usr/bin/env bash
set -euo pipefail

if ! command -v emcc &>/dev/null; then
  echo "Error: emcc not found. Install Emscripten: https://emscripten.org/docs/getting_started/downloads.html"
  exit 1
fi

OUTPUT_DIR="public/wasm"
mkdir -p "$OUTPUT_DIR"

echo "Building WASM stub..."

emcc native/stub/stub.c \
  -O2 \
  -sMODULARIZE=1 \
  -sEXPORT_ES6=1 \
  -sEXPORT_NAME=createStubModule \
  '-sEXPORTED_FUNCTIONS=["_stub_hash","_malloc","_free"]' \
  '-sEXPORTED_RUNTIME_METHODS=["ccall"]' \
  -sALLOW_MEMORY_GROWTH=1 \
  -sINITIAL_MEMORY=4194304 \
  -sENVIRONMENT=worker \
  -o "$OUTPUT_DIR/stub.js"

echo "Done: $OUTPUT_DIR/stub.js + stub.wasm"
