/**
 * Main application entry point
 * Demo page for Kupyna hash function
 */

import { KupynaClient, toHex, formatBytes, formatDuration } from './lib/kupyna-client';
import type { KupynaHashSize } from './types/worker-messages';

// Create Kupyna client
const kupynaClient = new KupynaClient('./worker/kupyna.worker.ts');

// UI elements
let uploadArea: HTMLElement | null = null;
let fileInput: HTMLInputElement | null = null;
let hashSizeSelect: HTMLSelectElement | null = null;
let progressBar: HTMLElement | null = null;
let progressBarInner: HTMLElement | null = null;
let resultArea: HTMLElement | null = null;
let hashOutput: HTMLElement | null = null;
let statsOutput: HTMLElement | null = null;

/**
 * Initialize UI
 */
function initUI(): void {
  uploadArea = document.getElementById('upload-area');
  fileInput = document.getElementById('file-input') as HTMLInputElement;
  hashSizeSelect = document.getElementById('hash-size') as HTMLSelectElement;
  progressBar = document.getElementById('progress');
  progressBarInner = document.getElementById('progress-bar');
  resultArea = document.getElementById('result-area');
  hashOutput = document.getElementById('hash-output');
  statsOutput = document.getElementById('stats');

  if (!uploadArea || !fileInput || !hashSizeSelect) {
    console.error('Required UI elements not found');
    return;
  }

  // File input change handler
  fileInput.addEventListener('change', handleFileSelect);

  // Upload area click handler
  uploadArea.addEventListener('click', () => {
    fileInput?.click();
  });

  // Drag and drop handlers
  uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea?.classList.add('dragover');
  });

  uploadArea.addEventListener('dragleave', () => {
    uploadArea?.classList.remove('dragover');
  });

  uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea?.classList.remove('dragover');

    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  });
}

/**
 * Handle file selection
 */
function handleFileSelect(event: Event): void {
  const target = event.target as HTMLInputElement;
  const files = target.files;

  if (files && files.length > 0) {
    handleFile(files[0]);
  }
}

/**
 * Handle file processing
 */
async function handleFile(file: File): Promise<void> {
  if (!hashSizeSelect) return;

  try {
    // Get selected hash size
    const hashSize = parseInt(hashSizeSelect.value, 10) as KupynaHashSize;

    // Show progress
    showProgress();
    hideResult();

    // Initialize client if needed
    if (!kupynaClient.isInitialized()) {
      await kupynaClient.init('/wasm/kupyna.js');
    }

    // Read file
    const buffer = await file.arrayBuffer();

    // Compute hash
    const result = await kupynaClient.hash(buffer, {
      hashSize,
      onProgress: (progress) => {
        updateProgress(progress);
      },
    });

    // Hide progress
    hideProgress();

    // Display result
    displayResult(result.hash, file.size, result.durationMs, hashSize);
  } catch (error) {
    hideProgress();
    displayError(String(error));
  }
}

/**
 * Show progress bar
 */
function showProgress(): void {
  if (progressBar) {
    progressBar.classList.add('visible');
  }
}

/**
 * Hide progress bar
 */
function hideProgress(): void {
  if (progressBar) {
    progressBar.classList.remove('visible');
  }
}

/**
 * Update progress bar
 */
function updateProgress(progress: number): void {
  if (progressBarInner) {
    progressBarInner.style.width = `${progress}%`;
  }
}

/**
 * Show result area
 */
function showResult(): void {
  if (resultArea) {
    resultArea.classList.add('visible');
  }
}

/**
 * Hide result area
 */
function hideResult(): void {
  if (resultArea) {
    resultArea.classList.remove('visible');
  }
}

/**
 * Display hash result
 */
function displayResult(
  hash: Uint8Array,
  fileSize: number,
  durationMs: number,
  hashSize: KupynaHashSize
): void {
  const hexHash = toHex(hash);

  if (hashOutput) {
    hashOutput.textContent = hexHash;
  }

  if (statsOutput) {
    const speed = (fileSize / 1024 / 1024) / (durationMs / 1000); // MB/s
    statsOutput.innerHTML = `
      <strong>Розмір файлу:</strong> ${formatBytes(fileSize)}<br>
      <strong>Тип хешу:</strong> Kupyna-${hashSize * 8}<br>
      <strong>Час обробки:</strong> ${formatDuration(durationMs)}<br>
      <strong>Швидкість:</strong> ${speed.toFixed(2)} MB/s
    `;
  }

  showResult();
}

/**
 * Display error message
 */
function displayError(message: string): void {
  if (resultArea && hashOutput) {
    hashOutput.innerHTML = `<div class="error">Помилка: ${message}</div>`;
    if (statsOutput) {
      statsOutput.textContent = '';
    }
    showResult();
  }
}

/**
 * Initialize application
 */
async function init(): Promise<void> {
  console.log('Initializing Kupyna WASM Demo...');

  // Initialize UI
  initUI();

  // Check for SIMD support
  if (typeof WebAssembly !== 'undefined') {
    console.log('WebAssembly is supported');

    // Try to detect SIMD support (not all browsers expose this)
    try {
      const simdSupported = await WebAssembly.validate(
        new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253, 15, 253, 98, 11])
      );
      console.log(`SIMD support: ${simdSupported ? 'YES' : 'NO'}`);
    } catch {
      console.log('SIMD support: UNKNOWN (detection failed)');
    }
  } else {
    console.error('WebAssembly is not supported');
    displayError('WebAssembly не підтримується в цьому браузері');
  }

  console.log('Application initialized');
}

// Start application when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    void init();
  });
} else {
  void init();
}
