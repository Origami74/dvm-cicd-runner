import {inject, injectable} from "tsyringe";
import type pino from "pino";
import ICommand from "../base/ICommand.ts";
import ICommandHandler from '../base/ICommandHandler.ts';
import {nostrNow} from "../../utils/nostrEventUtils.ts";
import {RelayProvider} from "../../RelayProvider.ts";
import type IRelayProvider from "../../IRelayProvider.ts";
import {NRelay, NSecSigner, NostrEvent} from '@nostrify/nostrify';
import {NOSTR_PRIVATE_KEY} from "../../utils/env.ts";

// As specified n NIP-90 Job feedback status
export enum JobFeedBackStatus {
    PaymentRequired = "payment-required",
    Processing = "processing",
    Error = "error",
    Success = "success",
    Partial = "partial"
}

export class PublishJobFeedbackCommand implements ICommand {
    jobRequest!: NostrEvent;
    status!: JobFeedBackStatus;
    statusExtraInfo?: string;
    content?: string;
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
        const signer = new NSecSigner(NOSTR_PRIVATE_KEY);
        const signerPubkey = await signer.getPublicKey();

        var note = {
            kind: command.jobRequest.kind + 1000,
            pubkey: signerPubkey,
            content: command.content,
            created_at: nostrNow(),
            tags: [
                ["status", command.status.toString(), command.statusExtraInfo],
                ["e", command.jobRequest.id],
                ["p", command.jobRequest.pubkey]
            ]
        }
        const envt = await signer.signEvent(note);

        await this.relay.event(envt)
    }
}