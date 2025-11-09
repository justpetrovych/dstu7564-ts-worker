cmake_minimum_required(VERSION 3.13)
project(kupyna_wasm C)

set(CMAKE_C_STANDARD 11)
set(CMAKE_C_STANDARD_REQUIRED ON)

# Source files
set(KUPYNA_SOURCES
    src/kupyna.c
    src/kupyna_tables.c
)

# Include directories
include_directories(include)

# Create WebAssembly library
add_executable(kupyna ${KUPYNA_SOURCES})

# Emscripten-specific flags for maximum performance
if(EMSCRIPTEN)
    # Optimization flags
    set(OPTIMIZATION_FLAGS
        "-O3"                           # Maximum optimization
        "-flto"                         # Link-Time Optimization
        "-ffast-math"                   # Fast math operations
    )

    # SIMD flags
    set(SIMD_FLAGS
        "-msimd128"                     # Enable SIMD instructions
        "-msse"                         # SSE support
        "-msse2"                        # SSE2 support
    )

    # Emscripten-specific settings
    set(EMSCRIPTEN_FLAGS
        "-sWASM=1"                      # Generate WebAssembly
        "-sWASM_BIGINT"                 # Native 64-bit integer support
        "-sMODULARIZE=1"                # Create factory function
        "-sEXPORT_ES6=1"                # ES6 module format
        "-sUSE_ES6_IMPORT_META=0"       # Avoid import.meta issues
        "-sENVIRONMENT=web,worker"      # Target web and worker environments
        "-sALLOW_MEMORY_GROWTH=1"       # Allow memory growth
        "-sINITIAL_MEMORY=16MB"         # Initial memory size
        "-sMAXIMUM_MEMORY=256MB"        # Maximum memory size
        "-sSTACK_SIZE=1MB"              # Stack size
        "-sEXPORT_NAME=createKupynaModule"  # Factory function name
        "-sMINIMAL_RUNTIME=0"           # Use full runtime for better compatibility
        "-sASSERTIONS=0"                # Disable assertions in production
        "-sMALLOC=emmalloc"             # Use emmalloc for smaller size
    )

    # Exported functions - all kupyna_* functions
    set(EXPORTED_FUNCTIONS
        "_kupyna_alloc"
        "_kupyna_init"
        "_kupyna_update"
        "_kupyna_final"
        "_kupyna_free"
        "_kupyna_hash"
        "_malloc"
        "_free"
    )

    # Convert exported functions list to comma-separated string
    list(JOIN EXPORTED_FUNCTIONS "," EXPORTED_FUNCTIONS_STR)
    set(EXPORT_FLAGS "-sEXPORTED_FUNCTIONS=[${EXPORTED_FUNCTIONS_STR}]")

    # Exported runtime methods
    set(EXPORTED_RUNTIME_METHODS
        "ccall"
        "cwrap"
        "getValue"
        "setValue"
        "UTF8ToString"
        "stringToUTF8"
    )
    list(JOIN EXPORTED_RUNTIME_METHODS "," EXPORTED_RUNTIME_METHODS_STR)
    set(RUNTIME_EXPORT_FLAGS "-sEXPORTED_RUNTIME_METHODS=[${EXPORTED_RUNTIME_METHODS_STR}]")

    # Combine all flags
    set(ALL_EMSCRIPTEN_FLAGS
        ${OPTIMIZATION_FLAGS}
        ${SIMD_FLAGS}
        ${EMSCRIPTEN_FLAGS}
        ${EXPORT_FLAGS}
        ${RUNTIME_EXPORT_FLAGS}
    )

    # Apply flags to target
    target_compile_options(kupyna PRIVATE ${OPTIMIZATION_FLAGS} ${SIMD_FLAGS})
    target_link_options(kupyna PRIVATE ${ALL_EMSCRIPTEN_FLAGS})

    # Set output name
    set_target_properties(kupyna PROPERTIES OUTPUT_NAME "kupyna")

    # Print configuration
    message(STATUS "Building Kupyna WASM with SIMD optimizations")
    message(STATUS "Optimization: -O3 -flto")
    message(STATUS "SIMD: -msimd128 -msse -msse2")
    message(STATUS "Export name: createKupynaModule")
    message(STATUS "Output: kupyna.js + kupyna.wasm")
endif()

# For native compilation (testing)
if(NOT EMSCRIPTEN)
    # Add test executables
    add_executable(test_compile test_compile.c ${KUPYNA_SOURCES})
    target_include_directories(test_compile PRIVATE include)

    add_executable(test_multiple test_multiple.c ${KUPYNA_SOURCES})
    target_include_directories(test_multiple PRIVATE include)

    # Enable testing
    enable_testing()
    add_test(NAME test_compile COMMAND test_compile)
    add_test(NAME test_multiple COMMAND test_multiple)
endif()
