import { useEffect, useRef, useState, type ReactNode } from "react";
import type { ScamScenario } from "../content/scams";

/** Inert stage scenery only: no wallet, links, secret inputs, or network calls. */
export function ScamScene({
  scenario,
  decision,
  onReview,
  controls,
  walletRequest,
}: {
  scenario: ScamScenario;
  decision: string;
  onReview: () => void;
  controls: ReactNode;
  walletRequest?: ReactNode;
}) {
  const [stage, setStage] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (stage > 0) {
      root.current
        ?.querySelector<HTMLElement>(decision ? ".scene-outcome" : "h2")
        ?.focus();
    }
  }, [stage, decision]);
  const [profile, setProfile] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const airdrop = scenario.id === "scam.airdrop";
  const address = scenario.id === "scam.address";
  function advance() {
    const next = stage + 1;
    setStage(next);
    if (next === (address ? 1 : 2)) onReview();
  }
  const decided = Boolean(decision);
  const approved = decision === "proceed";
  const fields = scenario.request.fields;
  const values = Object.fromEntries(fields);
  return (
    <div className="scam-scene" ref={root}>
      <ol className="scene-trail" aria-label="Simulation stages">
        {(address
          ? ["Recent activity", "Send review"]
          : airdrop
            ? ["Direct message", "Claim page", "Wallet request"]
            : ["Support chat", "Recovery page", "Access request"]
        ).map((label, index) => (
          <li key={label} aria-current={index === stage ? "step" : undefined}>
            <span>{index + 1}</span>
            {label}
          </li>
        ))}
      </ol>
      {!address && stage === 0 && (
        <div className="scene-chat">
          <aside aria-hidden="true">
            <b>◈</b>
            <span>SL</span>
            <span>✦</span>
            <span>+</span>
          </aside>
          <div className="scene-chat-main">
            <header>
              <span className="scene-avatar">{airdrop ? "SR" : "WS"}</span>
              <div>
                <strong>
                  {airdrop ? "Solana Rewards Support" : "Wallet Support"}
                </strong>
                <small>Direct message · Today at 12:42</small>
              </div>
            </header>
            <div className="scene-chat-body">
              <p className="scene-date">Today</p>
              <div className="scene-message">
                <strong>
                  {airdrop ? "Solana Rewards Support" : "Wallet Support"}
                </strong>
                <p>
                  {airdrop
                    ? "Your wallet qualified for an airdrop. Claim within 10 minutes."
                    : "Hey! I saw your question in the community. I can help get your wallet working again."}
                </p>
                {!airdrop && (
                  <p>
                    Open a recovery ticket and synchronize your wallet. I’ll
                    stay here while you finish.
                  </p>
                )}
                <div className="scene-link-preview">
                  <span>
                    {airdrop ? "◈ COMMUNITY REWARDS" : "WALLET HELP DESK"}
                  </span>
                  <h3>
                    {airdrop
                      ? "Your allocation is ready"
                      : "Restore your connection"}
                  </h3>
                  <p>
                    {airdrop
                      ? "Check your eligibility and receive your reward."
                      : "Complete the recovery steps to continue."}
                  </p>
                  <code>{scenario.request.origin}</code>
                  <button className="scene-action" onClick={advance}>
                    {airdrop ? "Claim reward" : "Open recovery page"}
                  </button>
                </div>
              </div>
              <p className="scene-message-muted">
                You haven’t replied to this conversation.
              </p>
            </div>
          </div>
        </div>
      )}
      {!address && stage === 1 && (
        <div className="scene-browser">
          <div className="scene-addressbar">
            <span aria-hidden="true">● ● ●</span>
            <code>{scenario.request.origin}/claim</code>
          </div>
          {airdrop ? (
            <div className="scene-claim-page">
              <nav>
                <strong>◈ Solana Community</strong>
                <button
                  className="scene-text-action"
                  onClick={() => setProfile(!profile)}
                  aria-expanded={profile}
                >
                  View project profile
                </button>
              </nav>
              {profile && (
                <div className="scene-profile">
                  <strong>Solana Community · simulated project profile</strong>
                  <p>Official website listed on profile</p>
                  <code>rewards.solana-community.example</code>
                  <small>Both domains belong to this fictional exercise.</small>
                </div>
              )}
              <span className="scene-pill">SEASON 04 · COMMUNITY REWARDS</span>
              <h2 tabIndex={-1}>
                Your next chapter
                <br />
                starts with a reward.
              </h2>
              <p>
                Your wallet is on the allocation list. Confirm your claim to
                receive your community reward.
              </p>
              <div className="scene-allocation">
                <span>Your allocation</span>
                <strong>400 COMMUNITY</strong>
                <small>Claim window · 10:00 shown by the page</small>
              </div>
              {walletRequest ?? (
                <button className="scene-action" onClick={advance}>
                  Review claim in wallet
                </button>
              )}
              <small>No purchase necessary. Your reward is waiting.</small>
            </div>
          ) : (
            <div className="scene-recovery-page">
              <span className="scene-avatar">WS</span>
              <h2 tabIndex={-1}>Synchronize your wallet</h2>
              <p>
                Your support ticket is ready. Restore your wallet connection to
                continue.
              </p>
              <div
                className="scene-phrase"
                aria-label="Disabled recovery phrase form"
              >
                <strong>Recovery phrase</strong>
                <div aria-hidden="true">
                  {Array.from({ length: 12 }, (_, i) => (
                    <span key={i}>{i + 1}. •••••</span>
                  ))}
                </div>
                <small>
                  Preview only. This simulation never accepts recovery words.
                </small>
              </div>
              <button className="scene-action" onClick={advance}>
                Review recovery request
              </button>
            </div>
          )}
        </div>
      )}
      {address && stage === 0 && (
        <div className="scene-wallet scene-history">
          <header>
            <span>◈ Practice wallet</span>
            <span className="scene-pill">Dummy account</span>
          </header>
          <h2 tabIndex={-1}>2.500000 SOL</h2>
          <p>Recent activity</p>
          <div className="scene-contact">
            <small>Saved contact · Wallet B</small>
            <code>{values["Trusted destination"]}</code>
          </div>
          <div className="scene-activity">
            <span className="scene-transfer-icon">↙</span>
            <div>
              <strong>Received 0.000001 SOL</strong>
              <small>From A7K4…LM2Q · Just now</small>
            </div>
          </div>
          <button className="scene-action" onClick={advance}>
            Use recent recipient
          </button>
        </div>
      )}
      {stage === (address ? 1 : 2) && (
        <div className="scene-wallet">
          <header>
            <span>◈ Practice wallet</span>
            <span className="scene-pill">Dummy account</span>
          </header>
          <p className="scene-wallet-source">
            {airdrop
              ? scenario.request.origin
              : address
                ? "Send to recent recipient"
                : "Recovery access request"}
          </p>
          <div className="scene-wallet-icon" aria-hidden="true">
            {airdrop || address ? "↗" : "⌘"}
          </div>
          <h2 tabIndex={-1}>
            {airdrop
              ? "Send 0.4 SOL"
              : address
                ? "Send 0.1 SOL"
                : "Share recovery access"}
          </h2>
          <p>
            {airdrop || address
              ? "Transaction request"
              : "Website information request · no transaction"}
          </p>
          <div className="scene-balance">
            <span>Dummy balance</span>
            <strong>
              {approved
                ? airdrop
                  ? "2.099995 SOL"
                  : address
                    ? "2.399995 SOL"
                    : "2.500000 SOL"
                : "2.500000 SOL"}
            </strong>
          </div>
          {address && (
            <div className="scene-contact">
              <small>Saved contact · Wallet B</small>
              <code>{values["Trusted destination"]}</code>
            </div>
          )}
          <dl className="scene-wallet-details">
            <div className={decided && airdrop ? "scene-evidence" : ""}>
              <dt>
                {airdrop
                  ? "Wallet action"
                  : address
                    ? "Recipient"
                    : "Requested access"}
              </dt>
              <dd>
                {airdrop
                  ? values.Instruction
                  : address
                    ? expanded || decided
                      ? values["Proposed destination"]
                      : "A7K4…LM2Q"
                    : values["Requested access"]}
              </dd>
            </div>
            {(airdrop || address) && (
              <div>
                <dt>{airdrop ? "Recipient" : "Network fee"}</dt>
                <dd>
                  {airdrop ? values.Recipient : "0.000005 SOL (fictional)"}
                </dd>
              </div>
            )}
            {airdrop && (
              <div>
                <dt>Network fee</dt>
                <dd>{values["Network fee"]}</dd>
              </div>
            )}
          </dl>
          <button
            className="scene-text-action"
            aria-expanded={expanded}
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? "Hide full request" : "Inspect full request"}
          </button>
          {expanded && (
            <dl className="simulation-fields scene-full-request">
              {fields.map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          )}
          {!decided && controls}
          {decided && (
            <div className="scene-outcome" role="status" tabIndex={-1}>
              <strong>
                {approved ? "Simulation approved" : "Request rejected"}
              </strong>
              <p>
                {
                  scenario.request.choices.find((c) => c.id === decision)
                    ?.feedback
                }
              </p>
              <p>
                {airdrop
                  ? "The page promised you a reward. The transaction asked you to send SOL."
                  : address
                    ? "The shortcut matches. The complete destination does not match your saved contact."
                    : "Support asked for recovery words and remote control. That would expose access to your wallet."}
              </p>
              {airdrop && (
                <div className="scene-evidence">
                  Page: Claim reward
                  <br />
                  Wallet: Send 0.4 SOL
                </div>
              )}
              {address && (
                <div className="scene-evidence">
                  <small>Full-address comparison</small>
                  <code>{values["Trusted destination"]}</code>
                  <code>{values["Proposed destination"]}</code>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
