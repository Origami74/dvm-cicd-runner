import { inject, injectable } from "tsyringe";
import {
  getDecodedToken,
  PaymentRequest,
  PaymentRequestTransport,
  PaymentRequestTransportType,
  Proof
} from "@cashu/cashu-ts";

import type { IWallet } from "./wallet.ts"
import { Wallet } from "./wallet.ts";
import { getAmount, toCashuToken } from "../utils/money.ts";
import { MINT_URL, PRICE_PER_SEC, PRICE_UNIT, PROFIT_PAYOUT_THRESHOLD, PROFITS_PUBKEY } from "../utils/env.ts";
import { randomUUID } from "node:crypto";
import {EventPublisher, type IEventPublisher} from "../publisher/EventPublisher.ts";
import pino from "npm:pino@9.4.0";

export interface ICashRegister {
  createPaymentRequest(): PaymentRequest;
  collectToken(token: String): Promise<number>;
  collectPayment(proofs: Proof[]): Promise<number>;
  payoutOwner(ignoreThreshold: boolean): Promise<void>;
}

@injectable()
export class CashRegister implements ICashRegister {
  private profitsPubkey: string = PROFITS_PUBKEY;
  private profitsPayoutThreshold: number = PROFIT_PAYOUT_THRESHOLD;

  private wallet: IWallet;
  private eventPublisher: IEventPublisher;

  constructor(
      @inject("Logger") private logger: pino.Logger,
      @inject(Wallet.name) wallet: IWallet,
      @inject(EventPublisher.name) eventPublisher: IEventPublisher) {
    this.wallet = wallet;
    this.eventPublisher = eventPublisher;
  }

  createPaymentRequest(): PaymentRequest {
    const transport: PaymentRequestTransport = {
      type: PaymentRequestTransportType.NOSTR,
      target: "",
      tags: [["n", "90"]]
    }

    return new PaymentRequest(
      [transport],
      randomUUID(),
      PRICE_PER_SEC,
      PRICE_UNIT,
      [MINT_URL],
      "Price per minute of compute",
      true
    );
  }

  public async collectToken(token: string): Promise<number> {
    try{
      const proofs = getDecodedToken(token).proofs;

      await this.wallet.add(proofs);
      return getAmount(proofs)
    } catch (e) {
      console.error("Payment failed: Error redeeming cashu tokens", e);
      throw new Error("Payment failed");
    }
  }

  public async collectPayment(proofs: Proof[]): Promise<number> {
    try {
      await this.wallet.add(proofs);
      return getAmount(proofs);
    } catch (e) {
      console.error("Payment failed: Error redeeming cashu tokens", e);
      throw new Error("Payment failed");
    }
  }

  public async payoutOwner(ignoreThreshold: boolean = false) {
    const balance = this.wallet.getBalance();
    if (!ignoreThreshold && balance <= this.profitsPayoutThreshold) {
      this.logger.warn(
        `Balance of ${balance} not enough for payout threshold of ${this.profitsPayoutThreshold}, skipping payout...`,
      );
      return;
    }

    const nuts = await this.wallet.withdrawAll();

    try {
      const cashuToken = toCashuToken(nuts, this.wallet.mintUrl);
      await this.eventPublisher.publishDM(
        this.profitsPubkey,
        `Here's your profits from your relay proxying service. At ${new Date().toUTCString()}.\n ${cashuToken}`,
      );
    } catch (e) {
      console.error("Failed to forward payment in dm", e);

      // NOTE: this will not work if the nuts are locked to the profitsPubkey
      await this.wallet.add(nuts);
    }
  }
}
