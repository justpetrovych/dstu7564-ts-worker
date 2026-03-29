#!/bin/bash

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
NATIVE_DIR="$PROJECT_ROOT/native"
BUILD_DIR="$NATIVE_DIR/build-wasm"
OUTPUT_DIR="$PROJECT_ROOT/public/wasm"

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}  Kupyna WASM Build Script (SIMD Optimized)${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# Check if Emscripten is available
if ! command -v emcc &> /dev/null; then
    echo -e "${RED}Error: Emscripten (emcc) not found in PATH${NC}"
    echo -e "${YELLOW}Please install Emscripten SDK:${NC}"
    echo -e "  git clone https://github.com/emscripten-core/emsdk.git"
    echo -e "  cd emsdk"
    echo -e "  ./emsdk install latest"
    echo -e "  ./emsdk activate latest"
    echo -e "  source ./emsdk_env.sh"
    exit 1
fi

# Print Emscripten version
echo -e "${GREEN}✓${NC} Emscripten found: $(emcc --version | head -n1)"
echo ""

# Clean previous build
if [ -d "$BUILD_DIR" ]; then
    echo -e "${YELLOW}Cleaning previous build...${NC}"
    rm -rf "$BUILD_DIR"
fi

# Create build directory
echo -e "${BLUE}Creating build directory...${NC}"
mkdir -p "$BUILD_DIR"
mkdir -p "$OUTPUT_DIR"

# Navigate to build directory
cd "$BUILD_DIR"

# Configure with CMake
echo -e "${BLUE}Configuring CMake...${NC}"
emcmake cmake .. \
    -DCMAKE_BUILD_TYPE=Release \
    -DCMAKE_C_FLAGS="-DNDEBUG" \
    || { echo -e "${RED}CMake configuration failed${NC}"; exit 1; }

echo ""
echo -e "${BLUE}Compiling WASM module...${NC}"
echo -e "${YELLOW}This may take a minute due to optimization flags (-O3 -flto)...${NC}"
echo ""

# Build
emmake make || { echo -e "${RED}Build failed${NC}"; exit 1; }

echo ""
echo -e "${BLUE}Build completed successfully!${NC}"
echo ""

# Check if output files exist
if [ ! -f "kupyna.js" ] || [ ! -f "kupyna.wasm" ]; then
    echo -e "${RED}Error: Expected output files not found${NC}"
    echo -e "Looking for: kupyna.js and kupyna.wasm in $BUILD_DIR"
    ls -la
    exit 1
fi

# Get file sizes
WASM_SIZE=$(du -h kupyna.wasm | cut -f1)
JS_SIZE=$(du -h kupyna.js | cut -f1)

echo -e "${GREEN}✓${NC} WASM module: ${WASM_SIZE}"
echo -e "${GREEN}✓${NC} JS glue code: ${JS_SIZE}"
echo ""

# Copy to output directory
echo -e "${BLUE}Copying files to output directory...${NC}"
cp kupyna.js "$OUTPUT_DIR/"
cp kupyna.wasm "$OUTPUT_DIR/"

echo -e "${GREEN}✓${NC} Copied to: $OUTPUT_DIR"
echo ""

# Verify SIMD instructions in WASM
echo -e "${BLUE}Verifying SIMD instructions...${NC}"
if command -v wasm-objdump &> /dev/null; then
    SIMD_COUNT=$(wasm-objdump -d kupyna.wasm | grep -c "v128" || true)
    if [ "$SIMD_COUNT" -gt 0 ]; then
        echo -e "${GREEN}✓${NC} SIMD instructions found: $SIMD_COUNT v128 operations"
    else
        echo -e "${YELLOW}⚠${NC}  No SIMD instructions detected (might be optimized out or not shown)"
    fi
else
    echo -e "${YELLOW}⚠${NC}  wasm-objdump not available, skipping SIMD verification"
    echo -e "  Install wabt for verification: https://github.com/WebAssembly/wabt"
fi

echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}  Build Successful!${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo -e "Output files:"
echo -e "  • ${OUTPUT_DIR}/kupyna.js"
echo -e "  • ${OUTPUT_DIR}/kupyna.wasm"
echo ""
echo -e "Optimizations applied:"
echo -e "  • ${GREEN}✓${NC} -O3 -flto (Link-Time Optimization)"
echo -e "  • ${GREEN}✓${NC} -msimd128 (SIMD instructions)"
echo -e "  • ${GREEN}✓${NC} -sWASM_BIGINT (native 64-bit integers)"
echo -e "  • ${GREEN}✓${NC} -sMODULARIZE=1 (ES Module export)"
echo ""
echo -e "Next steps:"
echo -e "  1. Run ${BLUE}npm run dev${NC} to test in browser"
echo -e "  2. Check browser console for SIMD support"
echo -e "  3. Test with different file sizes"
echo ""
