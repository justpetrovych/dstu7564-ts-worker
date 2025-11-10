/**
 * Kupyna WASM Module Wrapper
 * Provides a TypeScript-friendly interface to the Kupyna hash function
 */

import type {
  KupynaModuleFactory,
  KupynaWasmModule,
  KupynaHashSize,
} from '../types/kupyna-wasm';

export class KupynaWasm {
  private module: KupynaWasmModule | null = null;
  private initialized = false;

  /**
   * Initialize the WASM module
   * @param wasmPath Path to the kupyna.js file
   */
  async init(wasmPath: string): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Dynamic import of the Emscripten-generated module
      const createKupynaModule = (await import(
        /* @vite-ignore */ wasmPath
      )) as unknown as KupynaModuleFactory;

      // Initialize the module
      this.module = await createKupynaModule({
        locateFile: (url: string) => {
          // Resolve .wasm file relative to .js file
          if (url.endsWith('.wasm')) {
            const basePath = wasmPath.substring(0, wasmPath.lastIndexOf('/'));
            return `${basePath}/${url}`;
          }
          return url;
        },
      });

      this.initialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize Kupyna WASM: ${String(error)}`);
    }
  }

  /**
   * Ensure module is initialized
   */
  private ensureInitialized(): KupynaWasmModule {
    if (!this.initialized || !this.module) {
      throw new Error('KupynaWasm not initialized. Call init() first.');
    }
    return this.module;
  }

  /**
   * Compute hash using streaming API (init, update, final)
   * @param data Input data
   * @param hashSize Hash size in bytes (32, 48, or 64)
   * @returns Hash as Uint8Array
   */
  hashStream(data: Uint8Array, hashSize: KupynaHashSize): Uint8Array {
    const mod = this.ensureInitialized();

    let ctx = 0;
    let dataPtr = 0;
    let hashPtr = 0;

    try {
      // Allocate context
      ctx = mod._kupyna_alloc();
      if (ctx === 0) {
        throw new Error('Failed to allocate Kupyna context');
      }

      // Initialize context
      const initResult = mod._kupyna_init(ctx, hashSize);
      if (initResult !== 0) {
        throw new Error(`kupyna_init failed with code ${initResult}`);
      }

      // Allocate memory for data
      dataPtr = mod._malloc(data.length);
      if (dataPtr === 0) {
        throw new Error('Failed to allocate memory for data');
      }

      // Copy data to WASM memory
      mod.HEAPU8.set(data, dataPtr);

      // Update hash
      const updateResult = mod._kupyna_update(ctx, dataPtr, data.length);
      if (updateResult !== 0) {
        throw new Error(`kupyna_update failed with code ${updateResult}`);
      }

      // Allocate memory for hash output
      hashPtr = mod._malloc(hashSize);
      if (hashPtr === 0) {
        throw new Error('Failed to allocate memory for hash');
      }

      // Finalize and get hash
      const finalResult = mod._kupyna_final(ctx, hashPtr);
      if (finalResult !== 0) {
        throw new Error(`kupyna_final failed with code ${finalResult}`);
      }

      // Copy hash from WASM memory
      const hash = new Uint8Array(hashSize);
      hash.set(mod.HEAPU8.subarray(hashPtr, hashPtr + hashSize));

      return hash;
    } finally {
      // Clean up
      if (dataPtr !== 0) mod._free(dataPtr);
      if (hashPtr !== 0) mod._free(hashPtr);
      if (ctx !== 0) mod._kupyna_free(ctx);
    }
  }

  /**
   * Compute hash using one-shot API
   * @param data Input data
   * @param hashSize Hash size in bytes (32, 48, or 64)
   * @returns Hash as Uint8Array
   */
  hash(data: Uint8Array, hashSize: KupynaHashSize): Uint8Array {
    const mod = this.ensureInitialized();

    let dataPtr = 0;
    let hashPtr = 0;

    try {
      // Allocate memory for data
      dataPtr = mod._malloc(data.length);
      if (dataPtr === 0) {
        throw new Error('Failed to allocate memory for data');
      }

      // Copy data to WASM memory
      mod.HEAPU8.set(data, dataPtr);

      // Allocate memory for hash output
      hashPtr = mod._malloc(hashSize);
      if (hashPtr === 0) {
        throw new Error('Failed to allocate memory for hash');
      }

      // Compute hash
      const result = mod._kupyna_hash(dataPtr, data.length, hashPtr, hashSize);
      if (result !== 0) {
        throw new Error(`kupyna_hash failed with code ${result}`);
      }

      // Copy hash from WASM memory
      const hash = new Uint8Array(hashSize);
      hash.set(mod.HEAPU8.subarray(hashPtr, hashPtr + hashSize));

      return hash;
    } finally {
      // Clean up
      if (dataPtr !== 0) mod._free(dataPtr);
      if (hashPtr !== 0) mod._free(hashPtr);
    }
  }

  /**
   * Check if WASM module is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}

/**
 * Convert Uint8Array to hex string
 */
export function toHex(data: Uint8Array): string {
  return Array.from(data)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Convert hex string to Uint8Array
 */
export function fromHex(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) {
    throw new Error('Hex string must have even length');
  }

  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}
