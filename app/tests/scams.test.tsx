import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  SCAM_SCENARIOS,
  hasScamScene,
  ALL_SCENARIOS,
  FINAL_SCENARIOS,
  inspectionTask,
  validAssessment,
} from "../src/content/scams";
import { ScamSimulator } from "../src/components/ScamSimulator";
vi.mock("../src/components/AirdropWalletPrompt", () => ({
  AirdropWalletPrompt: () => <div>Real wallet review mounted</div>,
}));
afterEach(cleanup);
function review(id: string) {
  const steps: Record<string, string[]> = {
    "scam.airdrop": ["Claim reward", "Review claim in wallet"],
    "scam.support": ["Open recovery page", "Review recovery request"],
    "scam.address": ["Use recent recipient"],
  };
  for (const name of steps[id] ?? ["Review simulated request"])
    fireEvent.click(screen.getByRole("button", { name, exact: true }));
}
describe.each(ALL_SCENARIOS)("$id evidence assessment", (scenario) => {
  it("withholds clues and requires inspection, decision and evidence", () => {
    const done = vi.fn();
    render(<ScamSimulator scenarioId={scenario.id} onAssessment={done} />);
    for (const clue of scenario.request.clues)
      expect(screen.queryByText(clue)).toBeNull();
    expect(screen.queryByText(scenario.takeaway)).toBeNull();
    review(scenario.id);
    expect(done).not.toHaveBeenCalled();
    const buttons = screen
      .getByRole("group", { name: "Choose a simulated response" })
      .querySelectorAll("button");
    expect(new Set([...buttons].map((b) => b.className)).size).toBe(1);
    const task = inspectionTask(scenario.id, "request")!;
    fireEvent.click(
      screen.getByRole("button", {
        name:
          scenario.request.recommended === "stop"
            ? "Reject"
            : scenario.request.recommended === "proceed"
              ? "Proceed"
              : "Investigate further",
        exact: true,
      }),
    );
    fireEvent.change(screen.getByLabelText("Inspection answer"), {
      target: { value: task.answer },
    });
    expect(done.mock.calls.some(([value]) => value !== null)).toBe(false);
    fireEvent.change(screen.getByLabelText("Supporting evidence"), {
      target: { value: task.answer },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Check decision and evidence" }),
    );
    expect(done).toHaveBeenLastCalledWith({
      variant: "request",
      inspection: task.answer,
      decision: scenario.request.recommended,
      evidence: task.answer,
    });
    expect(
      screen
        .getAllByRole("status")
        .map((node) => node.textContent)
        .join(" "),
    ).toContain("Decision supported");
  });
});
it.each(SCAM_SCENARIOS)(
  "$id includes a legitimate comparison and clears unfinished assessment state",
  (scenario) => {
    expect(scenario.comparison).toBeTruthy();
    const done = vi.fn();
    render(<ScamSimulator scenarioId={scenario.id} onAssessment={done} />);
    review(scenario.id);
    if (hasScamScene(scenario.id))
      fireEvent.click(
        screen.getByRole("button", { name: "Reject", exact: true }),
      );
    fireEvent.change(screen.getByLabelText("Inspection answer"), {
      target: { value: "unfinished" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Request B" }));
    expect(screen.queryByLabelText("Inspection answer")).toBeNull();
    fireEvent.click(
      screen.getByRole("button", { name: "Review simulated request" }),
    );
    expect(
      (screen.getByLabelText("Inspection answer") as HTMLInputElement).value,
    ).toBe("");
    expect(screen.queryByLabelText("Supporting evidence")).toBeNull();
    expect(done).toHaveBeenLastCalledWith(null);
    const task = inspectionTask(scenario.id, "comparison")!;
    expect(
      validAssessment(scenario.id, {
        variant: "comparison",
        inspection: task.answer,
        decision: "proceed",
        evidence: task.answer,
      }),
    ).toBe(true);
  },
);
it("keeps final assessments unseen in practice and tests proceed, reject and investigate", () => {
  expect(FINAL_SCENARIOS.map((s) => s.request.recommended)).toEqual([
    "proceed",
    "stop",
    "investigate",
  ]);
  expect(SCAM_SCENARIOS.some((s) => s.id.startsWith("final."))).toBe(false);
});

it("practice defaults to the real airdrop review and unmounts it when switching scenarios", async () => {
  const { ScamPractice } = await import("../src/components/ScamPractice");
  render(<ScamPractice heading={{ current: null }} />);
  expect(screen.queryByText("Real wallet review mounted")).toBeNull();
  expect(screen.queryByText(SCAM_SCENARIOS[0].takeaway)).toBeNull();
  fireEvent.click(
    screen.getByRole("button", { name: "Claim reward", exact: true }),
  );
  await screen.findByText("Real wallet review mounted");
  expect(
    screen.queryByRole("button", { name: "Try an actual wallet prompt" }),
  ).toBeNull();
  expect(
    screen.queryByRole("button", { name: "Reject", exact: true }),
  ).toBeNull();
  fireEvent.change(screen.getByLabelText("Choose a scenario"), {
    target: { value: SCAM_SCENARIOS[1].id },
  });
  expect(screen.queryByText("Real wallet review mounted")).toBeNull();
  expect(screen.queryByLabelText("Inspection answer")).toBeNull();
  expect(screen.queryByRole("status")).toBeNull();
  expect(screen.queryByText(SCAM_SCENARIOS[1].takeaway)).toBeNull();
});

it("stages the airdrop, exposes domain comparison, and reveals consequences only after acting", () => {
  const done = vi.fn();
  render(<ScamSimulator scenarioId="scam.airdrop" onAssessment={done} />);
  expect(screen.getByText("TRAINING SIMULATION")).toBeTruthy();
  expect(
    screen.getByText(
      "Your wallet qualified for an airdrop. Claim within 10 minutes.",
    ),
  ).toBeTruthy();
  expect(
    screen.queryByRole("button", { name: "Proceed", exact: true }),
  ).toBeNull();
  fireEvent.click(
    screen.getByRole("button", { name: "Claim reward", exact: true }),
  );
  fireEvent.click(screen.getByRole("button", { name: "View project profile" }));
  expect(screen.getByText("rewards.solana-community.example")).toBeTruthy();
  expect(screen.getByText("solana-rewards.example/claim")).toBeTruthy();
  expect(screen.queryByRole("status")).toBeNull();
  fireEvent.click(
    screen.getByRole("button", { name: "Review claim in wallet" }),
  );
  expect(screen.getByRole("heading", { name: "Send 0.4 SOL" })).toBeTruthy();
  expect(screen.queryByRole("status")).toBeNull();
  expect(screen.queryByLabelText("Inspection answer")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Proceed", exact: true }));
  expect(screen.getByText("2.099995 SOL")).toBeTruthy();
  expect(screen.getByRole("status").textContent).toContain(
    "The page promised you a reward. The transaction asked you to send SOL.",
  );
  expect(done.mock.calls.some(([value]) => value !== null)).toBe(false);
  fireEvent.click(screen.getByRole("button", { name: "Reset simulation" }));
  expect(
    screen.getByRole("button", { name: "Claim reward", exact: true }),
  ).toBeTruthy();
  expect(screen.queryByRole("status")).toBeNull();
  review("scam.airdrop");
  fireEvent.click(screen.getByRole("button", { name: "Reject", exact: true }));
  expect(screen.getByText("2.500000 SOL")).toBeTruthy();
  expect(screen.queryByText("2.099995 SOL")).toBeNull();
});

it("puts poisoning in recent activity and lets learners expand the full destination before deciding", () => {
  render(<ScamSimulator scenarioId="scam.address" />);
  expect(screen.getByText("Received 0.000001 SOL")).toBeTruthy();
  review("scam.address");
  expect(screen.queryByText("TRAINING-A7K4-mN7qP9vT5xR3-LM2Q")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Inspect full request" }));
  expect(
    screen.getAllByText("TRAINING-A7K4-mN7qP9vT5xR3-LM2Q").length,
  ).toBeGreaterThan(0);
  expect(screen.queryByRole("status")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Reject", exact: true }));
  expect(screen.getByRole("status").textContent).toContain(
    "The complete destination does not match",
  );
});

it("keeps the support recovery form inert and never navigates to fictional domains", () => {
  render(<ScamSimulator scenarioId="scam.support" />);
  fireEvent.click(screen.getByRole("button", { name: "Open recovery page" }));
  const form = screen.getByLabelText("Disabled recovery phrase form");
  expect(form.querySelectorAll("input,textarea,form").length).toBe(0);
  expect(document.querySelectorAll("a,form,iframe").length).toBe(0);
  expect(screen.queryByRole("status")).toBeNull();
  fireEvent.click(
    screen.getByRole("button", { name: "Review recovery request" }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Proceed", exact: true }));
  expect(screen.getByRole("status").textContent).toContain(
    "recovery words and remote control",
  );
});

it("moves focus to the new stage and announces the decision outcome", () => {
  render(<ScamSimulator scenarioId="scam.airdrop" />);
  fireEvent.click(
    screen.getByRole("button", { name: "Claim reward", exact: true }),
  );
  expect(document.activeElement).toBe(
    screen.getByRole("heading", { name: /Your next chapter/ }),
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Review claim in wallet" }),
  );
  expect(document.activeElement).toBe(
    screen.getByRole("heading", { name: "Send 0.4 SOL" }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Reject", exact: true }));
  expect(document.activeElement).toBe(screen.getByRole("status"));
});

it("renders the supplied wallet review inside the claim page without a mock decision", () => {
  const done = vi.fn();
  render(
    <ScamSimulator
      scenarioId="scam.airdrop"
      onAssessment={done}
      walletRequest={<div>Real wallet review mounted</div>}
    />,
  );
  expect(screen.queryByText("Real wallet review mounted")).toBeNull();
  fireEvent.click(
    screen.getByRole("button", { name: "Claim reward", exact: true }),
  );
  expect(screen.getByText("Real wallet review mounted")).toBeTruthy();
  expect(
    screen.queryByRole("button", { name: "Try an actual wallet prompt" }),
  ).toBeNull();
  expect(
    screen.queryByRole("button", { name: "Proceed", exact: true }),
  ).toBeNull();
  expect(done).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Reset simulation" }));
  expect(screen.queryByText("Real wallet review mounted")).toBeNull();
});
