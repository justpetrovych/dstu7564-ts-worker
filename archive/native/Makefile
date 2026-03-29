# Makefile for Kupyna (DSTU 7564) implementation

CC = gcc
EMCC = emcc
CFLAGS = -Wall -Wextra -I. -Iinclude
OPTFLAGS = -O2
BUILDDIR = build

# Source files
SRC = src/kupyna.c src/kupyna_tables.c
OBJ = $(BUILDDIR)/kupyna.o $(BUILDDIR)/kupyna_tables.o
TESTS = $(BUILDDIR)/test_kupyna $(BUILDDIR)/test_multiple

# WASM files
WASM_OUT = $(BUILDDIR)/kupyna.js $(BUILDDIR)/kupyna.wasm

# Default target
all: native

# Create build directory
$(BUILDDIR):
	mkdir -p $(BUILDDIR)

# Native compilation
native: $(BUILDDIR) $(OBJ) $(TESTS)

$(BUILDDIR)/kupyna_tables.o: src/kupyna_tables.c | $(BUILDDIR)
	$(CC) $(CFLAGS) -c $< -o $@

$(BUILDDIR)/kupyna.o: src/kupyna.c include/kupyna.h | $(BUILDDIR)
	$(CC) $(CFLAGS) -c $< -o $@

# Test executables
$(BUILDDIR)/test_compile.o: test_compile.c include/kupyna.h | $(BUILDDIR)
	$(CC) $(CFLAGS) -c $< -o $@

$(BUILDDIR)/test_kupyna: $(OBJ) $(BUILDDIR)/test_compile.o
	$(CC) $^ -o $@

$(BUILDDIR)/test_multiple.o: test_multiple.c include/kupyna.h | $(BUILDDIR)
	$(CC) $(CFLAGS) -c $< -o $@

$(BUILDDIR)/test_multiple: $(OBJ) $(BUILDDIR)/test_multiple.o
	$(CC) $^ -o $@

# Run tests
test: $(BUILDDIR)/test_kupyna $(BUILDDIR)/test_multiple
	@echo "Running basic tests..."
	@./$(BUILDDIR)/test_kupyna
	@echo ""
	@echo "Running extended tests..."
	@./$(BUILDDIR)/test_multiple

# WebAssembly compilation
wasm: $(BUILDDIR)
	$(EMCC) $(SRC) -I./include \
		-o $(BUILDDIR)/kupyna.js \
		-O3 \
		-s WASM=1 \
		-s EXPORTED_FUNCTIONS='["_kupyna_alloc","_kupyna_init","_kupyna_update","_kupyna_final","_kupyna_free","_kupyna_hash","_malloc","_free"]' \
		-s EXPORTED_RUNTIME_METHODS='["cwrap","setValue","getValue","UTF8ToString"]' \
		-s ALLOW_MEMORY_GROWTH=1 \
		-s MODULARIZE=1 \
		-s EXPORT_NAME='createKupynaModule'
	@echo "WebAssembly build complete: $(BUILDDIR)/kupyna.js and $(BUILDDIR)/kupyna.wasm"

# WebAssembly with SIMD (experimental)
wasm-simd: $(BUILDDIR)
	$(EMCC) $(SRC) -I./include \
		-o $(BUILDDIR)/kupyna-simd.js \
		-O3 \
		-msimd128 \
		-s WASM=1 \
		-s EXPORTED_FUNCTIONS='["_kupyna_alloc","_kupyna_init","_kupyna_update","_kupyna_final","_kupyna_free","_kupyna_hash","_malloc","_free"]' \
		-s EXPORTED_RUNTIME_METHODS='["cwrap","setValue","getValue","UTF8ToString"]' \
		-s ALLOW_MEMORY_GROWTH=1 \
		-s MODULARIZE=1 \
		-s EXPORT_NAME='createKupynaModule'
	@echo "WebAssembly SIMD build complete: $(BUILDDIR)/kupyna-simd.js"

# Static library
libkupyna.a: $(BUILDDIR) $(OBJ)
	ar rcs $(BUILDDIR)/libkupyna.a $(OBJ)
	@echo "Static library created: $(BUILDDIR)/libkupyna.a"

# Clean build artifacts
clean:
	rm -rf $(BUILDDIR)

# Rebuild everything
rebuild: clean all

# Show help
help:
	@echo "Available targets:"
	@echo "  all (default)  - Build native library and tests"
	@echo "  native         - Build native library and tests"
	@echo "  test           - Run all tests"
	@echo "  wasm           - Build WebAssembly module"
	@echo "  wasm-simd      - Build WebAssembly module with SIMD"
	@echo "  libkupyna.a    - Build static library"
	@echo "  clean          - Remove build artifacts"
	@echo "  rebuild        - Clean and rebuild"
	@echo "  help           - Show this help message"

.PHONY: all native test wasm wasm-simd clean rebuild help
