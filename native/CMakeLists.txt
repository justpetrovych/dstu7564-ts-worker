cmake_minimum_required(VERSION 3.13)
project(kupyna_wasm C)

set(CMAKE_C_STANDARD 11)
set(CMAKE_C_STANDARD_REQUIRED ON)

set(KUPYNA_SOURCES
    src/kupyna.c
    src/kupyna_tables.c
)

include_directories(include)

add_executable(kupyna ${KUPYNA_SOURCES})

if(EMSCRIPTEN)
    set(OPTIMIZATION_FLAGS "-O3" "-flto" "-ffast-math")
    set(SIMD_FLAGS "-msimd128" "-msse" "-msse2")

    set(EMSCRIPTEN_FLAGS
        "-sWASM=1"
        "-sWASM_BIGINT"
        "-sMODULARIZE=1"
        "-sEXPORT_ES6=1"
        "-sENVIRONMENT=web,worker"
        "-sALLOW_MEMORY_GROWTH=1"
        "-sINITIAL_MEMORY=16MB"
        "-sMAXIMUM_MEMORY=256MB"
        "-sSTACK_SIZE=1MB"
        "-sEXPORT_NAME=createKupynaModule"
        "-sMINIMAL_RUNTIME=0"
        "-sASSERTIONS=0"
        "-sMALLOC=emmalloc"
    )

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
    list(JOIN EXPORTED_FUNCTIONS "," EXPORTED_FUNCTIONS_STR)
    set(EXPORT_FLAGS "-sEXPORTED_FUNCTIONS=[${EXPORTED_FUNCTIONS_STR}]")

    # HEAPU8 is required explicitly in Emscripten 3.x/4.x for module access
    set(EXPORTED_RUNTIME_METHODS
        "ccall"
        "cwrap"
        "getValue"
        "setValue"
        "HEAPU8"
    )
    list(JOIN EXPORTED_RUNTIME_METHODS "," EXPORTED_RUNTIME_METHODS_STR)
    set(RUNTIME_EXPORT_FLAGS "-sEXPORTED_RUNTIME_METHODS=[${EXPORTED_RUNTIME_METHODS_STR}]")

    set(ALL_EMSCRIPTEN_FLAGS
        ${OPTIMIZATION_FLAGS}
        ${SIMD_FLAGS}
        ${EMSCRIPTEN_FLAGS}
        ${EXPORT_FLAGS}
        ${RUNTIME_EXPORT_FLAGS}
    )

    target_compile_options(kupyna PRIVATE ${OPTIMIZATION_FLAGS} ${SIMD_FLAGS})
    target_link_options(kupyna PRIVATE ${ALL_EMSCRIPTEN_FLAGS})
    set_target_properties(kupyna PROPERTIES OUTPUT_NAME "kupyna")

    message(STATUS "Building Kupyna WASM with SIMD optimizations")
endif()

if(NOT EMSCRIPTEN)
    add_executable(test_compile test_compile.c ${KUPYNA_SOURCES})
    target_include_directories(test_compile PRIVATE include)

    add_executable(test_multiple test_multiple.c ${KUPYNA_SOURCES})
    target_include_directories(test_multiple PRIVATE include)

    enable_testing()
    add_test(NAME test_compile COMMAND test_compile)
    add_test(NAME test_multiple COMMAND test_multiple)
endif()
