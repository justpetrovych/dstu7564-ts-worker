import { describe, it, expect } from 'vitest';
import { toHex, formatBytes } from '@/lib/hash-utils';

describe('toHex', () => {
  it('converts empty array to empty string', () => {
    expect(toHex(new Uint8Array(0))).toBe('');
  });

  it('converts single byte', () => {
    expect(toHex(new Uint8Array([0x00]))).toBe('00');
    expect(toHex(new Uint8Array([0xff]))).toBe('ff');
    expect(toHex(new Uint8Array([0x0a]))).toBe('0a');
  });

  it('pads single-digit hex values with leading zero', () => {
    expect(toHex(new Uint8Array([0x01, 0x0f]))).toBe('010f');
  });

  it('converts known byte sequence', () => {
    expect(toHex(new Uint8Array([0xab, 0xab, 0xab]))).toBe('ababab');
  });

  it('converts 32-byte all-zero array', () => {
    expect(toHex(new Uint8Array(32))).toBe('0'.repeat(64));
  });
});

describe('formatBytes', () => {
  it('formats bytes', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(1)).toBe('1 B');
    expect(formatBytes(1023)).toBe('1023 B');
  });

  it('formats kilobytes', () => {
    expect(formatBytes(1024)).toBe('1.0 KB');
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(1024 * 1023)).toBe('1023.0 KB');
  });

  it('formats megabytes', () => {
    expect(formatBytes(1024 * 1024)).toBe('1.00 MB');
    expect(formatBytes(1024 * 1024 * 2.5)).toBe('2.50 MB');
  });
});
