import { useId, useState, type ReactNode } from "react";
import { ScamScene } from "./ScamScene";
import {
  ALL_SCENARIOS,
  hasScamScene,
  inspectionTask,
  validAssessment,
  type Assessment,
  type ScamScenario,
} from "../content/scams";

/** This component intentionally has no wallet, RPC, network, clipboard, or account dependencies. */
export function ScamSimulator({
  scenarioId,
  onAssessment,
  walletRequest,
}: {
  scenarioId: string;
  onAssessment?: (result: Assessment | null) => void;
  walletRequest?: ReactNode;
}) {
  const scenario = ALL_SCENARIOS.find((item) => item.id === scenarioId);
  return scenario ? (
    <Simulation
      key={scenarioId}
      scenario={scenario}
      onAssessment={onAssessment}
      walletRequest={walletRequest}
    />
  ) : null;
}
function Simulation({
  scenario,
  onAssessment,
  walletRequest,
}: {
  scenario: ScamScenario;
  onAssessment?: (result: Assessment | null) => void;
  walletRequest?: ReactNode;
}) {
  const id = useId();
  const [attempt, setAttempt] = useState(0);
  const [open, setOpen] = useState(false);
  const [variant, setVariant] = useState<Assessment["variant"]>("request");
  const [inspection, setInspection] = useState("");
  const [decision, setDecision] = useState("");
  const [evidence, setEvidence] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const request =
    variant === "comparison" ? scenario.comparison! : scenario.request;
  const task = inspectionTask(scenario.id, variant)!;
  const result = { variant, inspection, decision, evidence };
  const correct = validAssessment(scenario.id, result);
  const immersive = variant === "request" && hasScamScene(scenario.id);
  function reset(next = variant) {
    setAttempt((value) => value + 1);
    setVariant(next);
    setInspection("");
    setDecision("");
    setEvidence("");
    setSubmitted(false);
    setOpen(false);
    onAssessment?.(null);
  }
  const controls = (
    <div
      className="simulation-choices"
      role="group"
      aria-label="Choose a simulated response"
    >
      {request.choices.map((choice) => (
        <button
          key={choice.id}
          className="button button-secondary"
          aria-pressed={decision === choice.id}
          onClick={() => {
            setDecision(choice.id);
            setEvidence("");
            setSubmitted(false);
            onAssessment?.(null);
          }}
        >
          {choice.id === "proceed"
            ? "Proceed"
            : choice.id === "stop"
              ? "Reject"
              : "Investigate further"}
        </button>
      ))}
    </div>
  );
  return (
    <section
      className="scam-simulator"
      aria-label={`${scenario.title} simulation`}
    >
      <div className="simulation-banner">
        <strong>
          {walletRequest ? "TRAINING EXERCISE" : "TRAINING SIMULATION"}
        </strong>
        <span>
          {walletRequest
            ? "Airdrop claim uses a real Devnet sign-only prompt. No broadcast."
            : "No wallet request. No funds or secrets."}
        </span>
      </div>
      {scenario.comparison && (
        <div
          className="simulation-comparisons"
          role="group"
          aria-label="Compare training examples"
        >
          <button
            aria-pressed={variant === "request"}
            onClick={() => reset("request")}
          >
            Request A
          </button>
          <button
            aria-pressed={variant === "comparison"}
            onClick={() => reset("comparison")}
          >
            Request B
          </button>
        </div>
      )}
      {immersive ? (
        <ScamScene
          key={`${scenario.id}-${variant}-${attempt}`}
          scenario={scenario}
          decision={decision}
          onReview={() => setOpen(true)}
          controls={controls}
          walletRequest={
            scenario.id === "scam.airdrop" ? walletRequest : undefined
          }
        />
      ) : (
        <div className="simulation-invitation">
          <span className="eyebrow">{request.kind}</span>
          <h2>{request.label}</h2>
          <p>{request.claim}</p>
          <button
            className="button button-secondary"
            aria-expanded={open}
            aria-controls={id}
            onClick={() => setOpen(!open)}
          >
            {open ? "Hide simulated request" : "Review simulated request"}
          </button>
        </div>
      )}
      {open && (!immersive || decision) && (
        <div className="simulation-request" id={id}>
          {!immersive && (
            <dl className="simulation-fields">
              <div>
                <dt>Requesting site or source</dt>
                <dd>
                  <code>{request.origin}</code>
                </dd>
              </div>
              {request.fields.map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          )}
          <label className="scenario-picker">
            {task.question}
            <input
              aria-label="Inspection answer"
              value={inspection}
              onChange={(e) => {
                setInspection(e.target.value);
                setSubmitted(false);
                onAssessment?.(null);
              }}
            />
          </label>
          {!immersive && controls}
          {decision && (
            <>
              <label className="scenario-picker">
                Which evidence supports your decision?
                <select
                  aria-label="Supporting evidence"
                  value={evidence}
                  onChange={(e) => {
                    setEvidence(e.target.value);
                    setSubmitted(false);
                    onAssessment?.(null);
                  }}
                >
                  <option value="">Choose evidence</option>
                  {request.fields.map(([label, value]) => (
                    <option key={label} value={value}>
                      {label}: {value}
                    </option>
                  ))}
                  {!request.fields.some(
                    ([, value]) => value === task.answer,
                  ) && (
                    <option value={task.answer}>
                      The full comparison: {task.answer}
                    </option>
                  )}
                  <option value="branding">The page looks professional</option>
                  <option value="reject-all">
                    All wallet requests should be rejected
                  </option>
                </select>
              </label>
              <button
                className="button button-secondary"
                disabled={!inspection.trim() || !evidence}
                onClick={() => {
                  setSubmitted(true);
                  if (correct) onAssessment?.(result);
                }}
              >
                Check decision and evidence
              </button>
            </>
          )}
          {submitted && (
            <div className="simulation-feedback" role="status">
              <strong>
                {correct
                  ? "Decision supported by evidence."
                  : "Inspect the evidence and try again."}
              </strong>
              <p>{request.choices.find((c) => c.id === decision)?.feedback}</p>
              <ul>
                {request.clues.map((clue) => (
                  <li key={clue}>{clue}</li>
                ))}
              </ul>
              <p>{scenario.takeaway}</p>
            </div>
          )}
        </div>
      )}
      <button className="text-button simulation-reset" onClick={() => reset()}>
        Reset simulation
      </button>
      <p className="simulation-footnote">
        Fictional training content. No recovery-phrase entry is provided.
      </p>
    </section>
  );
}
