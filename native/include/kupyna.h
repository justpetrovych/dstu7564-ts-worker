/*
 * Simplified DSTU 7564 (Kupyna) hash implementation for WebAssembly
 * Based on cryptonite library by PrivatBank IT
 *
 * Copyright (c) 2016 PrivatBank IT <acsk@privatbank.ua>. All rights reserved.
 * Redistribution and modifications are permitted subject to BSD license.
 */

#ifndef KUPYNA_H
#define KUPYNA_H

#include <stdint.h>
#include <stddef.h>

#ifdef __cplusplus
extern "C" {
#endif

/* Return codes */
#define KUPYNA_OK                0
#define KUPYNA_ERROR_NULL_CTX    -1
#define KUPYNA_ERROR_INVALID_LEN -2
#define KUPYNA_ERROR_NOT_INIT    -3
#define KUPYNA_ERROR_ALLOC       -4

/* Context structure (opaque) */
typedef struct KupynaCtx KupynaCtx;

/**
 * Allocate Kupyna context
 *
 * @return pointer to context or NULL on error
 */
KupynaCtx* kupyna_alloc(void);

/**
 * Initialize Kupyna context
 *
 * @param ctx context pointer
 * @param hash_len hash length in bytes (32, 48, or 64)
 * @return KUPYNA_OK on success, error code otherwise
 */
int kupyna_init(KupynaCtx* ctx, size_t hash_len);

/**
 * Update hash with data
 *
 * @param ctx context pointer
 * @param data input data
 * @param len data length in bytes
 * @return KUPYNA_OK on success, error code otherwise
 */
int kupyna_update(KupynaCtx* ctx, const uint8_t* data, size_t len);

/**
 * Finalize hash computation
 *
 * @param ctx context pointer
 * @param hash output buffer (must be at least hash_len bytes)
 * @return KUPYNA_OK on success, error code otherwise
 */
int kupyna_final(KupynaCtx* ctx, uint8_t* hash);

/**
 * Free Kupyna context
 *
 * @param ctx context pointer
 */
void kupyna_free(KupynaCtx* ctx);

/**
 * One-shot hash computation
 *
 * @param data input data
 * @param data_len data length in bytes
 * @param hash output buffer
 * @param hash_len hash length in bytes (32, 48, or 64)
 * @return KUPYNA_OK on success, error code otherwise
 */
int kupyna_hash(const uint8_t* data, size_t data_len, uint8_t* hash, size_t hash_len);

#ifdef __cplusplus
}
#endif

#endif /* KUPYNA_H */
