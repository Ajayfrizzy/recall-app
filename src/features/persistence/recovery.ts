// A failed save stays pending until the user retries it successfully. Callers
// must not announce success or repeat external actions while storage is failing.
export async function saveWithRecovery(
  save: () => Promise<void>,
  waitForRetry: () => Promise<void>,
): Promise<void> {
  for (;;) {
    try {
      await save();
      return;
    } catch {
      await waitForRetry();
    }
  }
}
