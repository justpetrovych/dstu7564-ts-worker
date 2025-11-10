/*
 * Simple compilation test for Kupyna implementation
 */

#include <stdio.h>
#include <string.h>
#include "include/kupyna.h"

int main(void) {
    KupynaCtx* ctx;
    uint8_t hash[64];
    const uint8_t test_data[] = "Hello, World!";
    int ret;

    printf("Testing Kupyna hash implementation...\n");

    /* Test allocation */
    ctx = kupyna_alloc();
    if (!ctx) {
        printf("ERROR: Failed to allocate context\n");
        return 1;
    }
    printf("Context allocated successfully\n");

    /* Test initialization */
    ret = kupyna_init(ctx, 32);
    if (ret != KUPYNA_OK) {
        printf("ERROR: Failed to initialize (code %d)\n", ret);
        kupyna_free(ctx);
        return 1;
    }
    printf("Context initialized for 256-bit hash\n");

    /* Test update */
    ret = kupyna_update(ctx, test_data, strlen((const char*)test_data));
    if (ret != KUPYNA_OK) {
        printf("ERROR: Failed to update (code %d)\n", ret);
        kupyna_free(ctx);
        return 1;
    }
    printf("Data updated successfully\n");

    /* Test finalization */
    ret = kupyna_final(ctx, hash);
    if (ret != KUPYNA_OK) {
        printf("ERROR: Failed to finalize (code %d)\n", ret);
        kupyna_free(ctx);
        return 1;
    }
    printf("Hash computed successfully\n");

    /* Print hash */
    printf("Hash (256-bit): ");
    for (int i = 0; i < 32; i++) {
        printf("%02x", hash[i]);
    }
    printf("\n");

    /* Cleanup */
    kupyna_free(ctx);
    printf("Context freed successfully\n");

    /* Test one-shot API */
    ret = kupyna_hash(test_data, strlen((const char*)test_data), hash, 32);
    if (ret != KUPYNA_OK) {
        printf("ERROR: One-shot hash failed (code %d)\n", ret);
        return 1;
    }
    printf("One-shot hash computed successfully\n");

    printf("All tests passed!\n");
    return 0;
}
