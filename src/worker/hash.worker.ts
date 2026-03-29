export type HashRequest = {
  id: string;
  data: ArrayBuffer;
  hashSize: 32 | 48 | 64;
};

export type HashResponse =
  | { id: string; type: 'result'; result: ArrayBuffer }
  | { id: string; type: 'error'; message: string };

self.onmessage = async (e: MessageEvent<HashRequest>) => {
  const { id, hashSize } = e.data;

  try {
    // Simulate compute time
    await new Promise<void>((r) => setTimeout(r, 400));

    const result = new Uint8Array(hashSize).fill(0xab);

    const response: HashResponse = { id, type: 'result', result: result.buffer };
    self.postMessage(response, [result.buffer]);
  } catch (err) {
    const response: HashResponse = {
      id,
      type: 'error',
      message: err instanceof Error ? err.message : 'Unknown error',
    };
    self.postMessage(response);
  }
};
