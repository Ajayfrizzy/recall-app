// Some native fetch implementations may leave body reading pending after abort.
// Race the body against the same deadline that covers the HTTP request.
export function readResponseJson(
  response: Pick<Response, 'json'>,
  signal: AbortSignal,
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const abort = () => reject(new Error('Response deadline exceeded'));
    if (signal.aborted) {
      abort();
      return;
    }
    signal.addEventListener('abort', abort, { once: true });
    Promise.resolve()
      .then(() => response.json())
      .then(resolve, reject)
      .finally(() => {
        signal.removeEventListener('abort', abort);
      });
  });
}
