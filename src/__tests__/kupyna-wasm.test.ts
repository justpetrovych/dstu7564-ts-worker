/**
 * Cryptographic correctness tests for the Kupyna WASM module.
 * Reference values produced by native GCC compilation of the same C source.
 *
 * Tests are skipped when public/wasm/kupyna.js is not built yet.
 * Run `pnpm run build:wasm` first, then `pnpm test`.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

// ---------- Types ----------

interface KupynaModule {
  _kupyna_hash(dataPtr: number, dataLen: number, outPtr: number, outLen: number): number;
  _kupyna_alloc(): number;
  _kupyna_init(ctx: number, hashLen: number): number;
  _kupyna_update(ctx: number, dataPtr: number, len: number): number;
  _kupyna_final(ctx: number, outPtr: number): number;
  _kupyna_free(ctx: number): void;
  _malloc(size: number): number;
  _free(ptr: number): void;
  HEAPU8: Uint8Array;
}

// ---------- Helpers ----------

const ROOT = process.cwd();
const WASM_JS = join(ROOT, 'public/wasm/kupyna.js');
const WASM_BIN = join(ROOT, 'public/wasm/kupyna.wasm');
const wasmAvailable = existsSync(WASM_JS) && existsSync(WASM_BIN);

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function hashOneShot(mod: KupynaModule, input: Uint8Array, hashSize: 32 | 48 | 64): string {
  const dataPtr = mod._malloc(input.byteLength || 1);
  const outPtr = mod._malloc(hashSize);
  try {
    if (input.byteLength > 0) mod.HEAPU8.set(input, dataPtr);
    const ret = mod._kupyna_hash(dataPtr, input.byteLength, outPtr, hashSize);
    if (ret !== 0) throw new Error(`kupyna_hash error code: ${ret}`);
    return toHex(mod.HEAPU8.slice(outPtr, outPtr + hashSize));
  } finally {
    mod._free(dataPtr);
    mod._free(outPtr);
  }
}

function hashIncremental(mod: KupynaModule, chunks: Uint8Array[], hashSize: 32 | 48 | 64): string {
  const ctx = mod._kupyna_alloc();
  if (!ctx) throw new Error('kupyna_alloc returned null');
  const outPtr = mod._malloc(hashSize);
  try {
    expect(mod._kupyna_init(ctx, hashSize)).toBe(0);
    for (const chunk of chunks) {
      if (chunk.byteLength === 0) continue;
      const ptr = mod._malloc(chunk.byteLength);
      mod.HEAPU8.set(chunk, ptr);
      expect(mod._kupyna_update(ctx, ptr, chunk.byteLength)).toBe(0);
      mod._free(ptr);
    }
    expect(mod._kupyna_final(ctx, outPtr)).toBe(0);
    return toHex(mod.HEAPU8.slice(outPtr, outPtr + hashSize));
  } finally {
    mod._kupyna_free(ctx);
    mod._free(outPtr);
  }
}

// ---------- Tests ----------

describe.skipIf(!wasmAvailable)('Kupyna WASM — one-shot hashes', () => {
  let mod: KupynaModule;

  beforeAll(async () => {
    const { default: createModule } = (await import(
      /* @vite-ignore */ pathToFileURL(WASM_JS).href
    )) as { default: (opts?: object) => Promise<KupynaModule> };

    // Pass wasmBinary directly to bypass fetch (works in Node.js test env)
    const wasmBinary = new Uint8Array(readFileSync(WASM_BIN)).buffer;
    mod = await createModule({ wasmBinary });
  });

  const enc = (s: string) => new TextEncoder().encode(s);

  it('empty input → Купина-256', () => {
    expect(hashOneShot(mod, new Uint8Array(0), 32)).toBe(
      'cd5101d1ccdf0d1d1f4ada56e888cd724ca1a0838a3521e7131d4fb78d0f5eb6',
    );
  });

  it('"Hello, World!" → Купина-256', () => {
    expect(hashOneShot(mod, enc('Hello, World!'), 32)).toBe(
      '3adab8ab5c58f9651ce7fb8e4d218dc8401ff01cdcb8c09b87540b8d96550aec',
    );
  });

  it('"Hello, World!" → Купина-384', () => {
    expect(hashOneShot(mod, enc('Hello, World!'), 48)).toBe(
      '547b06174c72476d1e3eb13c6dbaeaf1062d5f9886b7d565855099a168c4d7dc155f3ac3126a2fbb3f3f809ed08bc20b',
    );
  });

  it('"Hello, World!" → Купина-512', () => {
    expect(hashOneShot(mod, enc('Hello, World!'), 64)).toBe(
      'de3614f39b0dbe8a0815c02191f0e5a3547b06174c72476d1e3eb13c6dbaeaf1062d5f9886b7d565855099a168c4d7dc155f3ac3126a2fbb3f3f809ed08bc20b',
    );
  });

  it('long message → Купина-256', () => {
    const msg =
      'The quick brown fox jumps over the lazy dog. ' +
      'The quick brown fox jumps over the lazy dog. ' +
      'The quick brown fox jumps over the lazy dog.';
    expect(hashOneShot(mod, enc(msg), 32)).toBe(
      'cd9ca83a5ab8d112d865e9f4a80d55c64016de213d70f5161a338c6d2827a6ca',
    );
  });

  it('binary 0x00…0xFF → Купина-256', () => {
    const data = Uint8Array.from({ length: 256 }, (_, i) => i);
    expect(hashOneShot(mod, data, 32)).toBe(
      'd305a32b963d149dc765f68594505d4077024f836c1bf03806e1624ce176c08f',
    );
  });
});

describe.skipIf(!wasmAvailable)('Kupyna WASM — incremental API', () => {
  let mod: KupynaModule;

  beforeAll(async () => {
    const { default: createModule } = (await import(
      /* @vite-ignore */ pathToFileURL(WASM_JS).href
    )) as { default: (opts?: object) => Promise<KupynaModule> };

    const wasmBinary = new Uint8Array(readFileSync(WASM_BIN)).buffer;
    mod = await createModule({ wasmBinary });
  });

  const enc = (s: string) => new TextEncoder().encode(s);

  it('incremental "Hello, " + "World!" matches one-shot', () => {
    const incremental = hashIncremental(mod, [enc('Hello, '), enc('World!')], 32);
    const oneShot = hashOneShot(mod, enc('Hello, World!'), 32);
    expect(incremental).toBe(oneShot);
  });

  it('single-chunk incremental matches one-shot for all hash sizes', () => {
    const input = enc('Hello, World!');
    for (const size of [32, 48, 64] as const) {
      expect(hashIncremental(mod, [input], size)).toBe(hashOneShot(mod, input, size));
    }
  });

  it('many small chunks produce same result as one-shot', () => {
    const msg = 'The quick brown fox jumps over the lazy dog.';
    const chunks = msg.split('').map((c) => enc(c));
    const expected = hashOneShot(mod, enc(msg), 32);
    expect(hashIncremental(mod, chunks, 32)).toBe(expected);
  });
});
