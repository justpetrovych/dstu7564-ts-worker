import { useEffect, useRef, useState } from 'react';
import { Upload, FileText, Hash, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { HasherClient } from '@/lib/hasher-client';

type HashSizeBytes = 32 | 48 | 64;

interface HashResult {
  hash: string;
  fileSize: number;
  durationMs: number;
}

const HASH_SIZE_LABELS: Record<HashSizeBytes, string> = {
  32: 'Купина-256',
  48: 'Купина-384',
  64: 'Купина-512',
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export default function KupynaHasher() {
  const [file, setFile] = useState<File | null>(null);
  const [hashSize, setHashSize] = useState<HashSizeBytes>(32);
  const [status, setStatus] = useState<'idle' | 'hashing' | 'done' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<HashResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const clientRef = useRef<HasherClient | null>(null);

  useEffect(() => {
    clientRef.current = new HasherClient();
    return () => clientRef.current?.terminate();
  }, []);

  function handleFile(f: File) {
    setFile(f);
    setResult(null);
    setError(null);
    setStatus('idle');
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }

  async function handleHash() {
    if (!file || status === 'hashing' || !clientRef.current) return;

    setStatus('hashing');
    setProgress(0);
    setResult(null);
    setError(null);

    // Animate progress bar while waiting for worker
    const interval = setInterval(() => {
      setProgress((p) => (p < 90 ? p + 5 : p));
    }, 25);

    try {
      const buffer = await file.arrayBuffer();
      const { hash, durationMs } = await clientRef.current.hash(buffer, hashSize);

      clearInterval(interval);
      setProgress(100);

      setResult({ hash: toHex(hash), fileSize: file.size, durationMs });
      setStatus('done');
    } catch (e) {
      clearInterval(interval);
      setError(e instanceof Error ? e.message : 'Невідома помилка');
      setStatus('error');
    }
  }

  const isHashing = status === 'hashing';
  const speedMbps =
    result && result.durationMs > 0
      ? ((result.fileSize / (1024 * 1024)) / (result.durationMs / 1000)).toFixed(1)
      : null;

  return (
    <Card className="w-full max-w-2xl shadow-2xl">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <Hash className="w-6 h-6 text-primary" />
            Купина
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">ДСТУ 7564:2014</Badge>
            <Badge variant="outline" className="text-emerald-700 border-emerald-300 bg-emerald-50">
              WASM · SIMD
            </Badge>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Криптографічна хеш-функція на WebAssembly
        </p>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Drop zone */}
        <div
          className={cn(
            'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
            isDragging
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/50 hover:bg-accent/30',
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = '';
            }}
          />
          {file ? (
            <div className="flex items-center justify-center gap-3 text-sm">
              <FileText className="w-5 h-5 text-primary shrink-0" />
              <div className="text-left min-w-0">
                <p className="font-medium truncate max-w-xs">{file.name}</p>
                <p className="text-muted-foreground">{formatBytes(file.size)}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
              <p className="text-sm font-medium">
                Перетягніть файл або натисніть для вибору
              </p>
              <p className="text-xs text-muted-foreground">Будь-який файл</p>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <label className="text-xs text-muted-foreground mb-1.5 block">
              Розмір хешу
            </label>
            <select
              value={hashSize}
              onChange={(e) => setHashSize(Number(e.target.value) as HashSizeBytes)}
              disabled={isHashing}
              className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
            >
              <option value={32}>Купина-256 (32 байти)</option>
              <option value={48}>Купина-384 (48 байтів)</option>
              <option value={64}>Купина-512 (64 байти)</option>
            </select>
          </div>

          <div className="pt-5">
            <Button
              size="lg"
              onClick={handleHash}
              disabled={!file || isHashing}
              className="gap-2"
            >
              <Zap className="w-4 h-4" />
              {isHashing ? 'Обчислення...' : 'Обчислити хеш'}
            </Button>
          </div>
        </div>

        {/* Progress */}
        {isHashing && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Обчислення {HASH_SIZE_LABELS[hashSize]} у Web Worker...</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-md bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-medium">{HASH_SIZE_LABELS[hashSize]}</span>
              <div className="flex gap-3">
                <span>{formatBytes(result.fileSize)}</span>
                <span>{result.durationMs.toFixed(1)} мс</span>
                {speedMbps && <span>{speedMbps} MB/s</span>}
              </div>
            </div>
            <div className="font-mono text-xs break-all leading-relaxed text-foreground/80 select-all">
              {result.hash}
            </div>
          </div>
        )}

        {/* Info */}
        <div className="rounded-md bg-blue-50 border border-blue-200 px-4 py-3 text-xs text-blue-700 space-y-1">
          <p className="font-semibold">ДСТУ 7564:2014 · Kupyna · WebAssembly + SIMD</p>
          <p>
            Реалізація Купина скомпільована з C через Emscripten з оптимізацією
            -O3 -flto -msimd128. Pipeline: Main Thread → Web Worker → WASM.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
