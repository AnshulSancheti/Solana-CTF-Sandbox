/** Wallet adapters may wrap Phantom's 4100 code under error or cause. */
export function isWalletAuthorizationError(error: unknown): boolean {
  const seen = new Set<unknown>();
  function inspect(value: unknown, depth: number): boolean {
    if (!value || typeof value !== "object" || depth > 4 || seen.has(value))
      return false;
    seen.add(value);
    const item = value as {
      code?: unknown;
      message?: unknown;
      error?: unknown;
      cause?: unknown;
    };
    return (
      item.code === 4100 ||
      item.code === "4100" ||
      (typeof item.message === "string" &&
        /not been authori[sz]ed|unauthori[sz]ed/i.test(item.message)) ||
      inspect(item.error, depth + 1) ||
      inspect(item.cause, depth + 1)
    );
  }
  return inspect(error, 0);
}
export const WALLET_AUTHORIZATION_HELP =
  "Your wallet has not authorized this account or signing method for this site. Reset the connection, select your Devnet practice account in the wallet, and reconnect. Then prepare a fresh request. No transaction will be retried automatically.";
