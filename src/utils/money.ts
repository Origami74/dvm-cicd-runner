import { Proof, getEncodedToken } from "@cashu/cashu-ts";
import {nostrNow} from "./nostrEventUtils.ts";
import {PRICE_PER_SEC} from "./env.ts";

export function getAmount(proofs: Proof[]): number {
  return proofs.reduce((total, proof) => total + proof.amount, 0);
}

export function toCashuToken(proofs: Proof[], mintUrl: string): string {
  return getEncodedToken({ proofs: proofs, mint: mintUrl });
}


export function calculateChange(workflowStartedAt: number, receivedAmount: number): number {
  const runDurationSeconds = nostrNow() - workflowStartedAt

  const totalPrice = Math.ceil(PRICE_PER_SEC * runDurationSeconds)
  return receivedAmount - totalPrice
}