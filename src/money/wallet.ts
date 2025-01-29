import { injectable } from "tsyringe";
import { CashuMint, CashuWallet, Proof } from "@cashu/cashu-ts";
import { bytesToHex } from "@noble/hashes/utils";

import { getAmount, toCashuToken } from "../utils/money.ts";
import { MINT_URL, NOSTR_PRIVATE_KEY_HEX } from "../utils/env.ts";
import {getEncodedTokenV4} from "npm:@cashu/cashu-ts@2.1.0";
import {inject} from "npm:tsyringe@4.8.0";
import pino from "npm:pino@9.4.0";

export interface IWallet {
  add(proofs: Proof[]): Promise<number>;
  withdrawAll(pubkey?: string): Promise<Proof[]>;
  getBalance(): number;
  
  mintUrl: string;
}

@injectable()
export class Wallet implements IWallet {
  private nutSack: Proof[] = [];

  public mintUrl: string = MINT_URL;
  private mint = new CashuMint(this.mintUrl);
  private cashuWallet = new CashuWallet(this.mint);

  constructor(
      @inject("Logger") private logger: pino.Logger,
  ) {
  }
  /**
   * Redeems tokens and adds them to wallet.
   * Returns total amount in wallet
   */
  public async add(proofs: Proof[]): Promise<number> {

    const token = getEncodedTokenV4({ mint: this.mintUrl, proofs: proofs });
    const received = await this.cashuWallet.receive(token);

    this.nutSack = [...this.nutSack, ...received];

    const receivedAmount = getAmount(proofs);
    const nutSackAmount = getAmount(this.nutSack);
    console.log(`Received ${receivedAmount} sats, wallet now contains ${nutSackAmount} sats`);

    return nutSackAmount;
  }

  /**
   * If a pubkey is passed, the tokens will be locked to that pubkey.
   */
  public async withdrawAll(pubkey: string | undefined): Promise<Proof[]> {
    const nuts = this.nutSack;
    this.nutSack = [];

    const removedAmount = getAmount(nuts);
    const nutSackAmount = getAmount(this.nutSack);
    console.log(`Removed ${removedAmount} sats, wallet now contains ${nutSackAmount} sats`);

    const { keep, send } = await this.cashuWallet.send(removedAmount, nuts, {privkey: NOSTR_PRIVATE_KEY_HEX});
    return send;
  }

  public getBalance = (): number => getAmount(this.nutSack);
}
