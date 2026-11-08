import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WALLET_AUTHORIZATION_HELP } from "../lib/walletAuthorization";

export function WalletAuthorizationHelp({ onReset }: { onReset: () => void }) {
  const wallet = useWallet();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function reset() {
    if (busy) return;
    onReset();
    setBusy(true);
    setError("");
    try {
      // Disconnect only. The learner reconnects explicitly through the normal wallet selector.
      await wallet.disconnect();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not disconnect the wallet.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <aside
      className="simulation-feedback"
      aria-label="Wallet authorization recovery"
    >
      <strong>Reconnect your practice account</strong>
      <p>{WALLET_AUTHORIZATION_HELP}</p>
      <button
        className="button button-secondary"
        disabled={busy}
        onClick={() => void reset()}
      >
        {busy ? "Resetting connection…" : "Reset wallet connection"}
      </button>
      <p>
        If this continues, remove this exact website from Phantom’s Connected
        Apps, then connect again and approve the intended account. Localhost and
        the deployed site require separate connections. Keep saved transaction
        receipts and browser data.
      </p>
      {error && <p role="alert">{error}</p>}
    </aside>
  );
}
