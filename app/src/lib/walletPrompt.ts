import { PublicKey, Transaction, type Connection } from "@solana/web3.js";
import { assertDevnet } from "./network";
import {
  assertTrainingTransfer,
  LIVE_AMOUNT,
  LIVE_MAX_FEE,
  prepareTrainingTransfer,
  unresolvedAttempt,
  type PreparedTransfer,
} from "./liveScam";
import { pendingTransaction } from "./transactionLifecycle";

function assertActive(active: () => boolean) {
  if (!active())
    throw new Error(
      "The practice account or page changed. Prepare a new preview.",
    );
}
function assertNoPending(owner: string) {
  if (pendingTransaction(owner) || unresolvedAttempt(owner))
    throw new Error(
      "Check your unresolved transaction receipt before opening another wallet request.",
    );
}
export async function prepareWalletPrompt(
  connection: Connection,
  owner: PublicKey,
) {
  assertNoPending(owner.toBase58());
  return prepareTrainingTransfer(connection, owner, "scam.airdrop");
}

/** Sign-only training boundary. Never stores, returns, or broadcasts a signed transaction. */
export async function requestWalletPrompt(
  connection: Connection,
  prepared: PreparedTransfer,
  sign: (transaction: Transaction) => Promise<Transaction>,
  active: () => boolean,
): Promise<void> {
  assertActive(active);
  await assertDevnet(connection);
  assertActive(active);
  assertNoPending(prepared.owner);
  if (prepared.scenario !== "scam.airdrop")
    throw new Error("Unexpected wallet practice scenario.");
  const owner = new PublicKey(prepared.owner);
  assertTrainingTransfer(prepared.transaction, owner, prepared.blockhash);
  if (
    (await connection.getBlockHeight("confirmed")) >
    prepared.lastValidBlockHeight
  )
    throw new Error(
      "This preview expired. Prepare a new preview before opening the wallet.",
    );
  const expectedMessage = prepared.transaction.serializeMessage();
  const fee = (
    await connection.getFeeForMessage(
      prepared.transaction.compileMessage(),
      "confirmed",
    )
  ).value;
  if (
    fee === null ||
    !Number.isSafeInteger(fee) ||
    fee < 0 ||
    fee > LIVE_MAX_FEE ||
    fee !== prepared.feeLamports
  )
    throw new Error(
      "The fee changed or exceeds the limit. Prepare a new preview.",
    );
  if ((await connection.getBalance(owner, "confirmed")) < LIVE_AMOUNT + fee)
    throw new Error(
      "Not enough Devnet SOL to preview this request. Use a Devnet faucet; do not buy test SOL.",
    );
  await assertDevnet(connection);
  if (
    (await connection.getBlockHeight("confirmed")) >
    prepared.lastValidBlockHeight
  )
    throw new Error(
      "This preview expired. Prepare a new preview before opening the wallet.",
    );
  assertActive(active);
  // Pass a copy to the adapter so it cannot mutate the retained preview.
  const unsigned = Transaction.from(
    prepared.transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    }),
  );
  assertTrainingTransfer(unsigned, owner, prepared.blockhash);
  if (!unsigned.serializeMessage().equals(expectedMessage))
    throw new Error(
      "The preview changed. Prepare a new preview before opening the wallet.",
    );
  const signed = await sign(unsigned);
  assertActive(active);
  assertTrainingTransfer(signed, owner, prepared.blockhash);
  if (
    !signed.serializeMessage().equals(expectedMessage) ||
    signed.signatures.length !== 1 ||
    !signed.signature ||
    !signed.verifySignatures(true)
  )
    throw new Error(
      "The wallet returned a different or invalid signed request. Nothing was submitted.",
    );
  // Deliberately discard the signed transaction. There is no broadcast or storage path.
}
