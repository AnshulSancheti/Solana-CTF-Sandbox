import { expect, it } from "vitest";
import { isWalletAuthorizationError } from "../src/lib/walletAuthorization";
it("recognizes the provider code, adapter wrappers, and Phantom's text", () => {
  expect(isWalletAuthorizationError({ code: 4100 })).toBe(true);
  expect(isWalletAuthorizationError({ error: { code: "4100" } })).toBe(true);
  expect(isWalletAuthorizationError({ cause: { code: 4100 } })).toBe(true);
  expect(
    isWalletAuthorizationError(
      new Error(
        "The requested method and/or account has not been authorized by the user.",
      ),
    ),
  ).toBe(true);
});
it("does not confuse rejection, funds, RPC errors, or cyclic causes with authorization", () => {
  for (const error of [
    new Error("User rejected"),
    { code: 4001 },
    new Error("Insufficient Devnet SOL"),
    new Error("RPC timeout"),
    null,
  ])
    expect(isWalletAuthorizationError(error)).toBe(false);
  const cyclic: { cause?: unknown } = {};
  cyclic.cause = cyclic;
  expect(isWalletAuthorizationError(cyclic)).toBe(false);
});
