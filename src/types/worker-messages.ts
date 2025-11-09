/**
 * Message types and interfaces for Worker communication
 */

import type { KupynaHashSize } from './kupyna-wasm';

// Message types from Main Thread to Worker
export enum WorkerCommandType {
  INIT = 'INIT',
  HASH = 'HASH',
  TERMINATE = 'TERMINATE',
}

// Message types from Worker to Main Thread
export enum WorkerResponseType {
  INIT_SUCCESS = 'INIT_SUCCESS',
  INIT_ERROR = 'INIT_ERROR',
  HASH_SUCCESS = 'HASH_SUCCESS',
  HASH_ERROR = 'HASH_ERROR',
  HASH_PROGRESS = 'HASH_PROGRESS',
}

// Command messages (Main -> Worker)
export interface InitCommand {
  type: WorkerCommandType.INIT;
  id: string;
  wasmPath: string;
}

export interface HashCommand {
  type: WorkerCommandType.HASH;
  id: string;
  buffer: ArrayBuffer; // Transferable
  hashSize: KupynaHashSize;
}

export interface TerminateCommand {
  type: WorkerCommandType.TERMINATE;
  id: string;
}

export type WorkerCommand = InitCommand | HashCommand | TerminateCommand;

// Response messages (Worker -> Main)
export interface InitSuccessResponse {
  type: WorkerResponseType.INIT_SUCCESS;
  id: string;
}

export interface InitErrorResponse {
  type: WorkerResponseType.INIT_ERROR;
  id: string;
  error: string;
}

export interface HashSuccessResponse {
  type: WorkerResponseType.HASH_SUCCESS;
  id: string;
  hash: ArrayBuffer; // Transferable
  durationMs: number;
}

export interface HashErrorResponse {
  type: WorkerResponseType.HASH_ERROR;
  id: string;
  error: string;
}

export interface HashProgressResponse {
  type: WorkerResponseType.HASH_PROGRESS;
  id: string;
  progress: number; // 0-100
}

export type WorkerResponse =
  | InitSuccessResponse
  | InitErrorResponse
  | HashSuccessResponse
  | HashErrorResponse
  | HashProgressResponse;
