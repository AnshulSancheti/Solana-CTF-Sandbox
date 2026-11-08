import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { Keypair } from "@solana/web3.js";
import { AirdropWalletPrompt } from "../src/components/AirdropWalletPrompt";
const mocks = vi.hoisted(() => ({
  wallet: {
    connected: true,
    publicKey: null as unknown,
    signTransaction: vi.fn() as unknown,
  },
  connection: { rpcEndpoint: "devnet" },
  prepare: vi.fn(),
  request: vi.fn(),
}));
vi.mock("@solana/wallet-adapter-react", () => ({
  useWallet: () => mocks.wallet,
  useConnection: () => ({ connection: mocks.connection }),
}));
vi.mock("@solana/wallet-adapter-react-ui", () => ({
  WalletMultiButton: () => <button>Connect practice wallet</button>,
}));
vi.mock("../src/lib/walletPrompt", () => ({
  prepareWalletPrompt: (...args: unknown[]) => mocks.prepare(...args),
  requestWalletPrompt: (...args: unknown[]) => mocks.request(...args),
}));
vi.mock("../src/lib/transactionLifecycle", () => ({
  withTransactionLock: (_owner: string, task: () => unknown) => task(),
}));
beforeEach(() => {
  vi.clearAllMocks();
  mocks.wallet = {
    connected: true,
    publicKey: Keypair.generate().publicKey,
    signTransaction: vi.fn(),
  };
  mocks.prepare.mockResolvedValue({ feeLamports: 5000 });
  mocks.request.mockResolvedValue(undefined);
});
afterEach(cleanup);
it("prepares and opens the native wallet from the claim button's single click", async () => {
  render(<AirdropWalletPrompt />);
  expect(mocks.prepare).not.toHaveBeenCalled();
  expect(mocks.request).not.toHaveBeenCalled();
  expect(
    screen.queryByRole("button", { name: "Prepare Devnet preview" }),
  ).toBeNull();
  expect(
    screen.queryByRole("button", { name: "Open actual wallet prompt" }),
  ).toBeNull();
  fireEvent.click(
    screen.getByRole("button", { name: "Review claim in wallet" }),
  );
  await waitFor(() => expect(mocks.request).toHaveBeenCalledTimes(1));
  expect(mocks.prepare).toHaveBeenCalledTimes(1);
  expect((await screen.findByRole("status")).textContent).toContain(
    "discarded",
  );
});
it("handles rejection and prepares a fresh request on the next click", async () => {
  mocks.request.mockRejectedValueOnce(new Error("User rejected the request"));
  render(<AirdropWalletPrompt />);
  fireEvent.click(
    screen.getByRole("button", { name: "Review claim in wallet" }),
  );
  expect((await screen.findByRole("status")).textContent).toContain(
    "User rejected",
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Review claim in wallet" }),
  );
  await waitFor(() => expect(mocks.request).toHaveBeenCalledTimes(2));
  expect(mocks.prepare).toHaveBeenCalledTimes(2);
});
it("connects explicitly and refuses wallets without a sign-only method", () => {
  mocks.wallet.connected = false;
  const view = render(<AirdropWalletPrompt />);
  expect(
    screen.getByRole("button", { name: "Connect practice wallet" }),
  ).toBeTruthy();
  expect(mocks.prepare).not.toHaveBeenCalled();
  view.unmount();
  mocks.wallet.connected = true;
  mocks.wallet.signTransaction = undefined;
  render(<AirdropWalletPrompt />);
  expect(
    (
      screen.getByRole("button", {
        name: "Review claim in wallet",
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
  expect(screen.getByRole("alert").textContent).toContain(
    "will not fall back to sign-and-send",
  );
});
it("blocks duplicate clicks and abandons an in-flight preview after an account change", async () => {
  let finish!: (value: unknown) => void;
  mocks.prepare.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const view = render(<AirdropWalletPrompt />);
  const claim = screen.getByRole("button", { name: "Review claim in wallet" });
  fireEvent.click(claim);
  expect(
    (
      screen.getByRole("button", {
        name: "Opening wallet…",
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
  fireEvent.click(claim);
  expect(mocks.prepare).toHaveBeenCalledTimes(1);
  mocks.wallet.publicKey = Keypair.generate().publicKey;
  view.rerender(<AirdropWalletPrompt />);
  finish({ feeLamports: 5000 });
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Review claim in wallet" }),
    ).toBeTruthy(),
  );
  expect(mocks.request).not.toHaveBeenCalled();
});
it("shows simulation errors without opening the wallet", async () => {
  mocks.prepare.mockRejectedValueOnce(
    new Error("The Devnet simulation failed"),
  );
  render(<AirdropWalletPrompt />);
  fireEvent.click(
    screen.getByRole("button", { name: "Review claim in wallet" }),
  );
  expect((await screen.findByRole("status")).textContent).toContain(
    "simulation failed",
  );
  expect(mocks.request).not.toHaveBeenCalled();
});
