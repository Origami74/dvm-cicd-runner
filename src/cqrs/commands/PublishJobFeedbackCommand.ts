import {inject, injectable} from "tsyringe";
import type pino from "pino";
import ICommand from "../base/ICommand.ts";
import ICommandHandler from '../base/ICommandHandler.ts';
import {nostrNow} from "../../utils/nostrEventUtils.ts";
import {RelayProvider} from "../../RelayProvider.ts";
import type IRelayProvider from "../../IRelayProvider.ts";
import {NRelay, NSecSigner} from '@nostrify/nostrify';
import {PRIVATE_KEY} from "../../utils/env.ts";

// As specified n NIP-90 Job feedback status
export enum JobFeedBackStatus {
    PaymentRequired = "payment-required",
    Processing = "processing",
    Error = "error",
    Success = "success",
    Partial = "partial"
}

export class PublishJobFeedbackCommand implements ICommand {
    jobRequestId!: string;
    status!: JobFeedBackStatus;
    statusExtraInfo?: string;
    relayHint?: string;
    content?: string;
    customerPubKey?: string;
}

@injectable()
export class PublishJobFeedbackCommandHandler implements ICommandHandler<PublishJobFeedbackCommand> {

    private relay: NRelay;

    constructor(
        @inject("Logger") private logger: pino.Logger,
        @inject(RelayProvider.name) relayProvider: IRelayProvider,
    ) {
        this.relay = relayProvider.getDefaultPool();
    }

    async execute(command: PublishJobFeedbackCommand): Promise<void> {
        const secretKey: string = PRIVATE_KEY
        const signer = new NSecSigner(secretKey);
        const signerPubkey = await signer.getPublicKey();

        var note = {
            kind: 7000,
            pubkey: signerPubkey,
            content: command.content,
            created_at: nostrNow(),
            tags: [
                ["status", command.status.toString(), command.statusExtraInfo],
                ["e", command.jobRequestId, command.relayHint],
                ["p", command.customerPubKey]
            ]
        }
        const envt = await signer.signEvent(note);

        await this.relay.event(envt)
    }
}