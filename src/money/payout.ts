import { inject, injectable } from "tsyringe";

import { CashRegister, type ICashRegister } from "./cashRegister.ts";
import { PROFIT_PAYOUT_INTERVAL_SECONDS } from "../utils/env.ts";
import pino from "npm:pino@9.4.0";

@injectable()
export default class Payout {
  private cashRegister: ICashRegister;

  running = false;
  interval = PROFIT_PAYOUT_INTERVAL_SECONDS * 1000;

  constructor(
      @inject("Logger") private logger: pino.Logger,
      @inject(CashRegister.name) cashRegister: ICashRegister,
  ) {
    this.cashRegister = cashRegister;
  }

  async payout(ignoreThreshold: boolean = false) {
    this.logger.info("Operator payout - Starting");
    await this.cashRegister.payoutOwner(ignoreThreshold);
    this.logger.info("Operator payout - Done");
  }

  private async update() {
    if (!this.running) return;
    await this.payout();

    setTimeout(this.update.bind(this), this.interval);
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
