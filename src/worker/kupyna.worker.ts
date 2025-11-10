/**
 * Kupyna Web Worker with Command Queue Architecture
 * Handles asynchronous WASM initialization and hash computation
 */

import { KupynaWasm } from '../wasm/kupyna-wasm';
import type {
  WorkerCommand,
  WorkerResponse,
  WorkerCommandType,
  WorkerResponseType,
} from '../types/worker-messages';

// Worker state
let wasmInstance: KupynaWasm | null = null;
let isInitialized = false;
let isInitializing = false;

// Command queue for commands received before WASM initialization
interface QueuedCommand {
  command: WorkerCommand;
  transferList?: Transferable[];
}
const commandQueue: QueuedCommand[] = [];

/**
 * Send response to main thread
 */
function postResponse(response: WorkerResponse, transfer?: Transferable[]): void {
  if (transfer) {
    postMessage(response, transfer);
  } else {
    postMessage(response);
  }
}

/**
 * Handle INIT command
 */
async function handleInit(command: WorkerCommand): Promise<void> {
  if (command.type !== 'INIT') return;

  if (isInitialized) {
    postResponse({
      type: 'INIT_SUCCESS' as WorkerResponseType.INIT_SUCCESS,
      id: command.id,
    });
    return;
  }

  if (isInitializing) {
    postResponse({
      type: 'INIT_ERROR' as WorkerResponseType.INIT_ERROR,
      id: command.id,
      error: 'Initialization already in progress',
    });
    return;
  }

  isInitializing = true;

  try {
    wasmInstance = new KupynaWasm();
    await wasmInstance.init(command.wasmPath);
    isInitialized = true;

    postResponse({
      type: 'INIT_SUCCESS' as WorkerResponseType.INIT_SUCCESS,
      id: command.id,
    });

    // Process queued commands
    await processQueue();
  } catch (error) {
    isInitializing = false;
    postResponse({
      type: 'INIT_ERROR' as WorkerResponseType.INIT_ERROR,
      id: command.id,
      error: String(error),
    });
  }
}

/**
 * Handle HASH command
 */
async function handleHash(command: WorkerCommand): Promise<void> {
  if (command.type !== 'HASH') return;

  if (!isInitialized || !wasmInstance) {
    throw new Error('WASM not initialized');
  }

  try {
    const startTime = performance.now();

    // Convert ArrayBuffer to Uint8Array
    const data = new Uint8Array(command.buffer);

    // Compute hash
    const hash = wasmInstance.hash(data, command.hashSize);

    const endTime = performance.now();
    const durationMs = endTime - startTime;

    // Create a proper ArrayBuffer for transfer (avoid SharedArrayBuffer)
    const hashBuffer = hash.buffer.slice(0) as ArrayBuffer;

    // Send result back with transferable
    postResponse(
      {
        type: 'HASH_SUCCESS' as WorkerResponseType.HASH_SUCCESS,
        id: command.id,
        hash: hashBuffer,
        durationMs,
      },
      [hashBuffer]
    );
  } catch (error) {
    postResponse({
      type: 'HASH_ERROR' as WorkerResponseType.HASH_ERROR,
      id: command.id,
      error: String(error),
    });
  }
}

/**
 * Handle TERMINATE command
 */
function handleTerminate(_command: WorkerCommand): void {
  // Clean up and close worker
  wasmInstance = null;
  isInitialized = false;
  commandQueue.length = 0;
  self.close();
}

/**
 * Process a single command
 */
async function processCommand(command: WorkerCommand): Promise<void> {
  switch (command.type) {
    case 'INIT' as WorkerCommandType.INIT:
      await handleInit(command);
      break;
    case 'HASH' as WorkerCommandType.HASH:
      await handleHash(command);
      break;
    case 'TERMINATE' as WorkerCommandType.TERMINATE:
      handleTerminate(command);
      break;
    default:
      console.error('Unknown command type:', command);
  }
}

/**
 * Process queued commands
 */
async function processQueue(): Promise<void> {
  while (commandQueue.length > 0) {
    const item = commandQueue.shift();
    if (item) {
      try {
        await processCommand(item.command);
      } catch (error) {
        console.error('Error processing queued command:', error);
      }
    }
  }
}

/**
 * Message handler - implements Command Queue pattern
 */
self.onmessage = async (event: MessageEvent<WorkerCommand>): Promise<void> => {
  const command = event.data;

  // Always handle INIT immediately
  if (command.type === ('INIT' as WorkerCommandType.INIT)) {
    await processCommand(command);
    return;
  }

  // If not initialized yet, queue the command
  if (!isInitialized) {
    commandQueue.push({ command });
    return;
  }

  // Process command immediately if initialized
  try {
    await processCommand(command);
  } catch (error) {
    console.error('Error processing command:', error);
  }
};

// Handle unhandled errors
self.onerror = (error): void => {
  console.error('Worker error:', error);
};

// Indicate worker is ready
console.log('Kupyna Worker initialized');
