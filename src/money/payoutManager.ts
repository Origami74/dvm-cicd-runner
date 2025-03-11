import { inject, injectable } from "tsyringe";

import {PROFIT_PAYOUT_INTERVAL_SECONDS, PROFIT_PAYOUT_THRESHOLD, PROFITS_PUBKEY} from "../utils/env.ts";
import pino from "npm:pino@9.4.0";
import {toCashuToken} from "../utils/money.ts";
import {type IWallet, Wallet} from "./wallet.ts";
import {EventPublisher, type IEventPublisher} from "../publisher/EventPublisher.ts";

@injectable()
export default class PayoutManager {
  private running = false;

  constructor(
      @inject("Logger") private logger: pino.Logger,
      @inject(EventPublisher.name) private eventPublisher: IEventPublisher,
      @inject(Wallet.name) private wallet: IWallet,
  ) {
  }

  async payout(ignoreThreshold: boolean = false) {
    this.logger.info("Operator payout - Starting");

    const balance = this.wallet.getBalance();
    if (!ignoreThreshold && balance <= PROFIT_PAYOUT_THRESHOLD) {
      this.logger.warn(
          `Balance of ${balance} not enough for payout threshold of ${PROFIT_PAYOUT_THRESHOLD}, skipping payout...`,
      );
      return;
    }

    const nuts = await this.wallet.withdrawAll();

    try {
      const cashuToken = toCashuToken(nuts, this.wallet.mintUrl);
      await this.eventPublisher.publishDM(
          PROFITS_PUBKEY,
          `Here's your profits for dvm-cicd-runner. At ${new Date().toUTCString()}.\n ${cashuToken}`,
      );
    } catch (e) {
      console.error("Failed to forward payment in dm", e);

      // NOTE: this will not work if the nuts are locked to the profitsPubkey
      await this.wallet.addProofs(nuts);
    }

    this.logger.info("Operator payout - Done");
  }

  private async update() {
    if (!this.running) return;
    await this.payout();

    setTimeout(this.update.bind(this), PROFIT_PAYOUT_INTERVAL_SECONDS * 1000);
  }

  async start() {
    if (this.running) return;
    this.running = true;

    await this.update();
    this.logger.info(`Started`);
  }

  async stop() {
    this.logger.info("Stopping payout");
    this.running = false;
    await this.payout(true);
  }
}
