import { injectable } from "tsyringe";
import { CashuMint, CashuWallet, Proof, getDecodedToken, type Token, getEncodedTokenV4 } from "@cashu/cashu-ts";

import { getAmount } from "../utils/money.ts";
import {DEVELOPER_SUPPORT_FACTOR, MINT_URL, PRICE_UNIT} from "../utils/env.ts";
import {inject} from "npm:tsyringe@4.8.0";
import pino from "npm:pino@9.4.0";
import {PublishDmCommand, PublishDmCommandHandler} from "../cqrs/commands/PublishDmCommand.ts";

export interface IWallet {
  receive(cashuToken: string): Promise<number>;
  addProofs(nuts: Proof[]): any;
  withdrawAll(pubkey?: string): Promise<Proof[]>;
  withdrawAmountAsToken(amount: number): Promise<string>;
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
      @inject(PublishDmCommand.name) private publishDmCommandHandler: PublishDmCommandHandler,
  ) {
  }

  /**
   * Redeems tokens and adds them to wallet.
   * Returns total amount in wallet
   */
  public async receive(tokenString: string): Promise<number> {
    const token: Token =  getDecodedToken(tokenString);

    if(token.mint != MINT_URL){
      throw new Error(`Mint '${token.mint}' not supported, use mint: ${MINT_URL}`)
    }

    const receivedProofs = await this.cashuWallet.receive(token);
    const receivedAmount = getAmount(receivedProofs);

    const keep = receivedProofs
    // const developerSupportAmount = Math.floor(receivedAmount * DEVELOPER_SUPPORT_FACTOR)
    //
    // const {keep, send: developerSupportProofs} = await this.cashuWallet.send(developerSupportAmount, receivedProofs, {includeFees: true});
    // const developerSupportToken = getEncodedTokenV4({mint: this.mint.mintUrl, proofs: developerSupportProofs});
    //
    // const developerPubkeyHex = "13c5231ece335f39bd0a464646c5c9adec37abe08c883b73753bc8a288595764"
    // await this.publishDmCommandHandler.execute({pubkey: developerPubkeyHex, message: developerSupportToken})

    const keepAmount = getAmount(keep);
    this.nutSack = [...this.nutSack, ...keep];

    const nutSackAmount = getAmount(this.nutSack);
    console.log(`Received ${keepAmount} sats, wallet now contains ${nutSackAmount} sats`);

    return receivedAmount;
  }

  public addProofs(nuts: Proof[]) {
    this.nutSack = [...this.nutSack, ...nuts];
  }

  /**
   * If a pubkey is passed, the tokens will be locked to that pubkey.
   */
  public async withdrawAll(): Promise<Proof[]> {
    const nuts = this.nutSack;
    this.nutSack = [];

    const removedAmount = getAmount(nuts);
    const nutSackAmount = getAmount(this.nutSack);
    console.log(`Removed ${removedAmount} ${PRICE_UNIT}'s. New balance: ${nutSackAmount} ${PRICE_UNIT}'s`);

    return nuts;
  }

  public async withdrawAmountAsToken(amount: number): Promise<string> {
    console.log(`Removed ${amount} ${PRICE_UNIT}'s. New balance: ${getAmount(this.nutSack)} ${PRICE_UNIT}'s`);
    const {keep, send} = await this.cashuWallet.send(amount, this.nutSack, {includeFees: true});
    this.nutSack = keep;

    return getEncodedTokenV4({mint: this.mint.mintUrl, proofs: send});;
  }

  public getBalance = (): number => getAmount(this.nutSack);
}
