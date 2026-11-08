import { useLayoutEffect, useRef, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import {
  LIVE_AMOUNT,
  LIVE_MAX_FEE,
  TRAINING_DESTINATION,
} from "../lib/liveScam";
import { withTransactionLock } from "../lib/transactionLifecycle";
import { prepareWalletPrompt, requestWalletPrompt } from "../lib/walletPrompt";

export function AirdropWalletPrompt() {
  const wallet = useWallet();
  const { connection } = useConnection();
  return (
    <Prompt key={`${wallet.publicKey?.toBase58()}:${connection.rpcEndpoint}`} />
  );
}
function Prompt() {
  const wallet = useWallet();
  const { connection } = useConnection();
  const owner = wallet.publicKey?.toBase58() ?? "";
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const running = useRef(false);
  const current = useRef({ owner, connected: wallet.connected, connection });
  const mounted = useRef(false);
  useLayoutEffect(() => {
    current.current = { owner, connected: wallet.connected, connection };
  });
  useLayoutEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const active = () =>
    mounted.current &&
    current.current.connected &&
    current.current.owner === owner &&
    current.current.connection === connection;
  async function reviewClaim() {
    if (
      running.current ||
      !wallet.publicKey ||
      !wallet.signTransaction ||
      !active()
    )
      return;
    running.current = true;
    setBusy(true);
    setNotice("");
    try {
      await withTransactionLock(owner, async () => {
        // One user gesture prepares, validates, and opens the native wallet.
        const prepared = await prepareWalletPrompt(
          connection,
          wallet.publicKey!,
        );
        if (!active()) return;
        await requestWalletPrompt(
          connection,
          prepared,
          (tx) => wallet.signTransaction!(tx),
          active,
        );
        if (active())
          setNotice(
            "The wallet signed the practice request. The signed transaction was discarded. Nothing was broadcast; no transfer or fee was submitted.",
          );
      });
    } catch (error) {
      if (active())
        setNotice(
          error instanceof Error
            ? error.message
            : "The wallet request did not complete. Nothing was broadcast.",
        );
    } finally {
      running.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  return (
    <div className="claim-wallet-action" aria-label="Real Devnet wallet review">
      <p className="claim-wallet-terms">
        Devnet training · {LIVE_AMOUNT / 1e9} test SOL · sign-only. The app
        discards the signature and never sends the transaction.
      </p>
      <details className="claim-wallet-details">
        <summary>Request details</summary>
        <p>
          Recipient: <code>{TRAINING_DESTINATION.toBase58()}</code>
        </p>
        <p>
          Fee ceiling: {LIVE_MAX_FEE / 1e9} test SOL. No fee is submitted by
          this exercise.
        </p>
        {owner && (
          <p>
            Sender and fee payer: <code>{owner}</code>
          </p>
        )}
      </details>
      {!wallet.connected || !wallet.publicKey ? (
        <WalletMultiButton />
      ) : (
        <>
          <button
            className="scene-action"
            disabled={busy || !wallet.signTransaction}
            onClick={() => void reviewClaim()}
          >
            {busy ? "Opening wallet…" : "Review claim in wallet"}
          </button>
          {!wallet.signTransaction && (
            <p role="alert">
              This wallet does not offer sign-only transactions. Choose a
              compatible wallet; this exercise will not fall back to
              sign-and-send.
            </p>
          )}
        </>
      )}
      {notice && <p role="status">{notice}</p>}
    </div>
  );
}
