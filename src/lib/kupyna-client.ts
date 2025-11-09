/**
 * Client-side wrapper for Kupyna Worker
 * Provides Promise-based API for main thread
 */

import type {
  WorkerCommand,
  WorkerResponse,
  WorkerCommandType,
  WorkerResponseType,
  KupynaHashSize,
} from '../types/worker-messages';

export interface HashOptions {
  hashSize?: KupynaHashSize;
  onProgress?: (progress: number) => void;
}

export interface HashResult {
  hash: Uint8Array;
  durationMs: number;
}

export class KupynaClient {
  private worker: Worker | null = null;
  private initialized = false;
  private initPromise: Promise<void> | null = null;
  private pendingRequests = new Map<
    string,
    {
      resolve: (value: unknown) => void;
      reject: (error: Error) => void;
      onProgress?: (progress: number) => void;
    }
  >();
  private requestId = 0;

  /**
   * Create a new Kupyna client
   * @param workerUrl URL to the worker script
   */
  constructor(private workerUrl: string) {}

  /**
   * Initialize the worker and WASM module
   * @param wasmPath Path to the kupyna.js file
   */
  async init(wasmPath: string): Promise<void> {
    if (this.initialized) {
      return;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve, reject) => {
      try {
        // Create worker
        this.worker = new Worker(new URL(this.workerUrl, import.meta.url), {
          type: 'module',
        });

        // Setup message handler
        this.worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
          this.handleWorkerMessage(event.data);
        };

        // Setup error handler
        this.worker.onerror = (error) => {
          console.error('Worker error:', error);
          reject(new Error(`Worker error: ${error.message}`));
        };

        // Send INIT command
        const id = this.generateId();
        this.pendingRequests.set(id, { resolve, reject });

        const command: WorkerCommand = {
          type: 'INIT' as WorkerCommandType.INIT,
          id,
          wasmPath,
        };

        this.worker.postMessage(command);
      } catch (error) {
        reject(error);
      }
    });

    await this.initPromise;
    this.initialized = true;
  }

  /**
   * Compute hash of data
   * @param data Input data (ArrayBuffer, Uint8Array, or Blob)
   * @param options Hash options
   * @returns Hash result with timing information
   */
  async hash(
    data: ArrayBuffer | Uint8Array | Blob,
    options: HashOptions = {}
  ): Promise<HashResult> {
    if (!this.initialized || !this.worker) {
      throw new Error('KupynaClient not initialized. Call init() first.');
    }

    const hashSize = options.hashSize ?? 32; // Default to Kupyna-256

    // Convert input to ArrayBuffer
    let buffer: ArrayBuffer;
    if (data instanceof Blob) {
      buffer = await data.arrayBuffer();
    } else if (data instanceof Uint8Array) {
      buffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
    } else {
      buffer = data;
    }

    return new Promise((resolve, reject) => {
      const id = this.generateId();
      this.pendingRequests.set(id, {
        resolve: resolve as (value: unknown) => void,
        reject,
        onProgress: options.onProgress,
      });

      const command: WorkerCommand = {
        type: 'HASH' as WorkerCommandType.HASH,
        id,
        buffer,
        hashSize,
      };

      // Send command with transferable
      this.worker!.postMessage(command, [buffer]);
    });
  }

  /**
   * Terminate the worker
   */
  terminate(): void {
    if (this.worker) {
      const command: WorkerCommand = {
        type: 'TERMINATE' as WorkerCommandType.TERMINATE,
        id: this.generateId(),
      };
      this.worker.postMessage(command);
      this.worker.terminate();
      this.worker = null;
    }
    this.initialized = false;
    this.initPromise = null;
    this.pendingRequests.clear();
  }

  /**
   * Check if client is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Generate unique request ID
   */
  private generateId(): string {
    return `req_${Date.now()}_${this.requestId++}`;
  }

  /**
   * Handle messages from worker
   */
  private handleWorkerMessage(response: WorkerResponse): void {
    const pending = this.pendingRequests.get(response.id);
    if (!pending) {
      console.warn('Received response for unknown request:', response.id);
      return;
    }

    switch (response.type) {
      case 'INIT_SUCCESS' as WorkerResponseType.INIT_SUCCESS:
        this.pendingRequests.delete(response.id);
        pending.resolve(undefined);
        break;

      case 'INIT_ERROR' as WorkerResponseType.INIT_ERROR:
        this.pendingRequests.delete(response.id);
        pending.reject(new Error(response.error));
        break;

      case 'HASH_SUCCESS' as WorkerResponseType.HASH_SUCCESS: {
        this.pendingRequests.delete(response.id);
        const hash = new Uint8Array(response.hash);
        pending.resolve({
          hash,
          durationMs: response.durationMs,
        });
        break;
      }

      case 'HASH_ERROR' as WorkerResponseType.HASH_ERROR:
        this.pendingRequests.delete(response.id);
        pending.reject(new Error(response.error));
        break;

      case 'HASH_PROGRESS' as WorkerResponseType.HASH_PROGRESS:
        if (pending.onProgress) {
          pending.onProgress(response.progress);
        }
        break;

      default:
        console.warn('Unknown response type:', response);
    }
  }
}

/**
 * Utility: Convert Uint8Array to hex string
 */
export function toHex(data: Uint8Array): string {
  return Array.from(data)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Utility: Format bytes to human-readable size
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Utility: Format duration to human-readable string
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms.toFixed(2)} ms`;
  }
  return `${(ms / 1000).toFixed(2)} s`;
}
