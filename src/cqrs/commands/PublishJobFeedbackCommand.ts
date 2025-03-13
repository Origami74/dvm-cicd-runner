import {inject, injectable} from "tsyringe";
import type pino from "pino";
import ICommand from "../base/ICommand.ts";
import ICommandHandler from '../base/ICommandHandler.ts';
import {nostrNow} from "../../utils/nostrEventUtils.ts";
import {RelayProvider} from "../../RelayProvider.ts";
import type IRelayProvider from "../../IRelayProvider.ts";
import {NRelay, NSecSigner, NostrEvent} from '@nostrify/nostrify';
import {NOSTR_PRIVATE_KEY} from "../../utils/env.ts";
import {PaymentRequest} from "npm:@cashu/cashu-ts";

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
    content?: string = ""
    addressPointers: string[] = [];
    paymentRequest?: PaymentRequest;
    paymentChange?: string;
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

        // TODO: expiring partals
        const jobFeedbackEvent = {
            kind: command.jobRequest.kind + 1000,
            pubkey: signerPubkey,
            content: command.content,
            created_at: nostrNow(),
            tags: [
                ["s", command.status.toString(), command.statusExtraInfo],
                ["e", command.jobRequest.id],
                ["p", command.jobRequest.pubkey],
            ]
        };

        // Add addresses pointers
        if(command.addressPointers?.length > 0) {
            command.addressPointers.forEach(addressPointer => {
                jobFeedbackEvent.tags.push(["a", addressPointer]);
            })
        }

        // add change
        if(command.paymentChange) {
            const encryptedPaymentChange = await signer.nip44.encrypt(command.jobRequest.pubkey, command.paymentChange)
            console.log("encryptedPaymentChange", encryptedPaymentChange)
            jobFeedbackEvent.tags.push(
                ["payment_change", encryptedPaymentChange] // potential privacy issue
            )
        }

        // if(command.paymentRequest){
        //     const amount = (command.paymentRequest.amount ?? 0) * 1000
        //     jobFeedbackEvent.tags.push(
        //         ["amount", amount.toString(), command.paymentRequest.toEncodedRequest()]
        //     )
        // }

        const envt = await signer.signEvent(jobFeedbackEvent);

        await this.relay.event(envt)
    }
}