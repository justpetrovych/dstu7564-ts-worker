import type { HashRequest, HashResponse } from '@/worker/hash.worker';

export interface HashResult {
  hash: Uint8Array;
  durationMs: number;
}

export class HasherClient {
  private worker: Worker;
  private pending = new Map<
    string,
    { resolve: (r: HashResult) => void; reject: (e: Error) => void; startTime: number }
  >();

  constructor() {
    this.worker = new Worker(new URL('../worker/hash.worker.ts', import.meta.url), {
      type: 'module',
    });

    this.worker.onmessage = (e: MessageEvent<HashResponse>) => {
      const { id } = e.data;
      const entry = this.pending.get(id);
      if (!entry) return;
      this.pending.delete(id);

      if (e.data.type === 'result') {
        entry.resolve({
          hash: new Uint8Array(e.data.result),
          durationMs: performance.now() - entry.startTime,
        });
      } else {
        entry.reject(new Error(e.data.message));
      }
    };

    this.worker.onerror = (e) => {
      for (const { reject } of this.pending.values()) {
        reject(new Error(e.message));
      }
      this.pending.clear();
    };
  }

  hash(data: ArrayBuffer, hashSize: 32 | 48 | 64): Promise<HashResult> {
    return new Promise((resolve, reject) => {
      const id = crypto.randomUUID();
      const startTime = performance.now();
      this.pending.set(id, { resolve, reject, startTime });

      // Transfer the buffer to the worker (zero-copy)
      const request: HashRequest = { id, data, hashSize };
      this.worker.postMessage(request, [data]);
    });
  }

  terminate() {
    this.worker.terminate();
    this.pending.clear();
  }
}
