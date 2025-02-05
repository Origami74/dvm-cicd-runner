import type pino from "pino";
import {inject, injectable} from "tsyringe";
import IEventHandler from '../base/IEventHandler.ts';
import IEvent from '../base/IEvent.ts';
import {NostrEvent} from '@nostrify/nostrify';
import type ICommandHandler from "../base/ICommandHandler.ts";
import {CloneRepositoryCommand} from "../commands/CloneRepositoryCommand.ts";
import {RunWorkflowCommand} from "../commands/RunWorkflowCommand.ts";
import {workflowRunRequestFromNostrEvent} from "../../WorkFlowRunRequest.ts";
import {JobFeedBackStatus, PublishJobFeedbackCommand} from "../commands/PublishJobFeedbackCommand.ts";
import {MINT_URL, PRICE_PER_SEC, PRICE_UNIT} from "../../utils/env.ts";
import {PaymentRequest, PaymentRequestTransport, PaymentRequestTransportType} from "npm:@cashu/cashu-ts";
import {randomUUID} from "node:crypto";

export class WorkflowRunRequestEvent implements IEvent {
    nostrEvent!: NostrEvent;
}

@injectable()
export class WorkflowRunRequestEventHandler implements IEventHandler<WorkflowRunRequestEvent> {

    constructor(
        @inject("Logger") private logger: pino.Logger,
        @inject(CloneRepositoryCommand.name) private cloneRepositoryCommandHandler: ICommandHandler<CloneRepositoryCommand>,
        @inject(RunWorkflowCommand.name) private runWorkflowCommandHandler: ICommandHandler<RunWorkflowCommand>,
        @inject(PublishJobFeedbackCommand.name) private publishJobFeedbackCommandHandler: ICommandHandler<PublishJobFeedbackCommand>,
    ) {

    }

    async execute(event: WorkflowRunRequestEvent): Promise<void> {
        this.logger.info(event.nostrEvent)
        try {

            const request = workflowRunRequestFromNostrEvent(event.nostrEvent)

            // Respond with quote
            if(!request.payment){
                const quoteAmount = request.workflowTimeOut * PRICE_PER_SEC
                const quoteExplanation = `Prepayment ${quoteAmount} ${PRICE_UNIT} for timeout ${request.workflowTimeOut}`

                const transport: PaymentRequestTransport = {
                    type: PaymentRequestTransportType.NOSTR,
                    target: "",
                    tags: [["n", "90"]]
                }

                const quote: PaymentRequest =  new PaymentRequest(
                    [transport],
                    randomUUID(),
                    quoteAmount,
                    PRICE_UNIT,
                    [MINT_URL],
                    quoteExplanation,
                    true
                );

                this.publishJobFeedbackCommandHandler.execute({
                    status: JobFeedBackStatus.PaymentRequired,
                    jobRequest: event.nostrEvent,
                    statusExtraInfo: quoteExplanation,
                    content: "",
                    paymentRequest: quote
                })

                return;
            }


            // Clone commit into tmp folder
            const dir = `tmp/${event.nostrEvent.id}`;
            await this.cloneRepositoryCommandHandler.execute({cloneDir: dir, repoAddress: request.repositoryAddress, repoRef: request.repositoryRef})

            // Execute pipeline build
            await this.runWorkflowCommandHandler.execute({jobRequest: event.nostrEvent, rootDir: dir, workflowFilePath: request.workflowFilePath})


            // Write output to result

        } catch (e){
            this.logger.error(e, "error when Building")
        }
    }
}