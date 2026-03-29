#include <stdint.h>
#include <string.h>

/*
 * Stub implementation: fills output with 0xAB regardless of input.
 * Used in Step 3 to validate the full WASM loading pipeline before
 * plugging in the real Kupyna algorithm in Step 4.
 */
void stub_hash(const uint8_t* data, uint32_t data_len,
               uint8_t* out, uint32_t out_len) {
    (void)data;
    (void)data_len;
    memset(out, 0xAB, out_len);
}
