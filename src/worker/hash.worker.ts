export type HashRequest = {
  id: string;
  data: ArrayBuffer;
  hashSize: 32 | 48 | 64;
};

export type HashResponse =
  | { id: string; type: 'result'; result: ArrayBuffer }
  | { id: string; type: 'error'; message: string };

// ---------- WASM module types ----------

interface WasmModule {
  _kupyna_hash(dataPtr: number, dataLen: number, outPtr: number, outLen: number): number;
  _malloc(size: number): number;
  _free(ptr: number): void;
  HEAPU8: Uint8Array;
}

// ---------- WASM loader ----------

let modulePromise: Promise<WasmModule> | null = null;

function loadWasm(): Promise<WasmModule> {
  if (modulePromise) return modulePromise;

  modulePromise = (async () => {
    const base = import.meta.env.BASE_URL as string;
    const jsUrl = `${base}wasm/kupyna.js`;
    const wasmUrl = `${base}wasm/kupyna.wasm`;

    const res = await fetch(jsUrl);
    if (!res.ok) throw new Error(`Failed to fetch ${jsUrl}: ${res.status}`);
    const jsText = await res.text();

    const blob = new Blob([jsText], { type: 'application/javascript' });
    const blobUrl = URL.createObjectURL(blob);

    try {
      const { default: createModule } = (await import(/* @vite-ignore */ blobUrl)) as {
        default: (opts?: object) => Promise<WasmModule>;
      };
      return await createModule({
        locateFile: (file: string) => (file.endsWith('.wasm') ? wasmUrl : file),
      });
    } finally {
      URL.revokeObjectURL(blobUrl);
    }
  })();

  return modulePromise;
}

// ---------- Hash computation ----------

const KUPYNA_OK = 0;

async function computeHash(data: ArrayBuffer, hashSize: 32 | 48 | 64): Promise<Uint8Array> {
  const mod = await loadWasm();
  const dataBytes = new Uint8Array(data);

  const dataPtr = mod._malloc(dataBytes.byteLength || 1);
  const outPtr = mod._malloc(hashSize);

  try {
    if (dataBytes.byteLength > 0) {
      mod.HEAPU8.set(dataBytes, dataPtr);
    }

    const ret = mod._kupyna_hash(dataPtr, dataBytes.byteLength, outPtr, hashSize);
    if (ret !== KUPYNA_OK) {
      throw new Error(`kupyna_hash returned error code ${ret}`);
    }

    return mod.HEAPU8.slice(outPtr, outPtr + hashSize);
  } finally {
    mod._free(dataPtr);
    mod._free(outPtr);
  }
}

// ---------- Message handler ----------

self.onmessage = async (e: MessageEvent<HashRequest>) => {
  const { id, data, hashSize } = e.data;

  try {
    const result = await computeHash(data, hashSize);
    const response: HashResponse = { id, type: 'result', result: result.buffer };
    self.postMessage(response, [result.buffer]);
  } catch (err) {
    const response: HashResponse = {
      id,
      type: 'error',
      message: err instanceof Error ? err.message : 'Unknown WASM error',
    };
    self.postMessage(response);
  }
};
