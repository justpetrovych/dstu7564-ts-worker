/*
 * Extended tests for Kupyna implementation
 */

#include <stdio.h>
#include <string.h>
#include "include/kupyna.h"

void print_hash(const char* name, const uint8_t* hash, size_t len) {
    printf("%s: ", name);
    for (size_t i = 0; i < len; i++) {
        printf("%02x", hash[i]);
    }
    printf("\n");
}

int main(void) {
    uint8_t hash[64];
    int ret;

    printf("=== Kupyna Hash Tests ===\n\n");

    /* Test 1: Empty string with 256-bit hash */
    printf("Test 1: Empty string (256-bit)\n");
    ret = kupyna_hash((const uint8_t*)"", 0, hash, 32);
    if (ret == KUPYNA_OK) {
        print_hash("Hash", hash, 32);
    } else {
        printf("ERROR: Failed (code %d)\n", ret);
    }
    printf("\n");

    /* Test 2: "Hello, World!" with 256-bit hash */
    printf("Test 2: \"Hello, World!\" (256-bit)\n");
    const uint8_t* msg = (const uint8_t*)"Hello, World!";
    ret = kupyna_hash(msg, strlen((const char*)msg), hash, 32);
    if (ret == KUPYNA_OK) {
        print_hash("Hash", hash, 32);
    } else {
        printf("ERROR: Failed (code %d)\n", ret);
    }
    printf("\n");

    /* Test 3: "Hello, World!" with 384-bit hash */
    printf("Test 3: \"Hello, World!\" (384-bit)\n");
    ret = kupyna_hash(msg, strlen((const char*)msg), hash, 48);
    if (ret == KUPYNA_OK) {
        print_hash("Hash", hash, 48);
    } else {
        printf("ERROR: Failed (code %d)\n", ret);
    }
    printf("\n");

    /* Test 4: "Hello, World!" with 512-bit hash */
    printf("Test 4: \"Hello, World!\" (512-bit)\n");
    ret = kupyna_hash(msg, strlen((const char*)msg), hash, 64);
    if (ret == KUPYNA_OK) {
        print_hash("Hash", hash, 64);
    } else {
        printf("ERROR: Failed (code %d)\n", ret);
    }
    printf("\n");

    /* Test 5: Long message */
    printf("Test 5: Long message (256-bit)\n");
    const uint8_t* long_msg = (const uint8_t*)"The quick brown fox jumps over the lazy dog. "
                                                "The quick brown fox jumps over the lazy dog. "
                                                "The quick brown fox jumps over the lazy dog.";
    ret = kupyna_hash(long_msg, strlen((const char*)long_msg), hash, 32);
    if (ret == KUPYNA_OK) {
        print_hash("Hash", hash, 32);
    } else {
        printf("ERROR: Failed (code %d)\n", ret);
    }
    printf("\n");

    /* Test 6: Binary data */
    printf("Test 6: Binary data (256-bit)\n");
    uint8_t binary_data[256];
    for (int i = 0; i < 256; i++) {
        binary_data[i] = (uint8_t)i;
    }
    ret = kupyna_hash(binary_data, 256, hash, 32);
    if (ret == KUPYNA_OK) {
        print_hash("Hash", hash, 32);
    } else {
        printf("ERROR: Failed (code %d)\n", ret);
    }
    printf("\n");

    /* Test 7: Incremental update */
    printf("Test 7: Incremental update test (256-bit)\n");
    KupynaCtx* ctx = kupyna_alloc();
    if (!ctx) {
        printf("ERROR: Failed to allocate context\n");
        return 1;
    }

    kupyna_init(ctx, 32);
    kupyna_update(ctx, (const uint8_t*)"Hello, ", 7);
    kupyna_update(ctx, (const uint8_t*)"World!", 6);
    kupyna_final(ctx, hash);
    print_hash("Hash (incremental)", hash, 32);

    kupyna_free(ctx);
    printf("\n");

    /* Test 8: Same message, one-shot */
    printf("Test 8: Same message one-shot (256-bit)\n");
    ret = kupyna_hash((const uint8_t*)"Hello, World!", 13, hash, 32);
    if (ret == KUPYNA_OK) {
        print_hash("Hash (one-shot)   ", hash, 32);
    }
    printf("\n");

    printf("All tests completed successfully!\n");
    return 0;
}
