import type pino from "pino";
import {inject, injectable} from "tsyringe";
import IEventHandler from '../base/IEventHandler.ts';
import IEvent from '../base/IEvent.ts';
import {NostrEvent} from '@nostrify/nostrify';
import {getParams, getTag} from "../../utils/nostrEventUtils.ts";
import { Address } from '@welshman/util';
import {WatchRepositoryCommand} from "../commands/WatchRepositoryCommand.ts";
import type ICommandHandler from "../base/ICommandHandler.ts";
import {CloneRepositoryCommand} from "../commands/CloneRepositoryCommand.ts";
import {DockerBuildCommand} from "../commands/DockerBuildCommand.ts";
import {UploadToBlossomCommand} from "../commands/UploadToBlossomCommand.ts";
import {JobFeedBackStatus, PublishJobFeedbackCommand} from "../commands/PublishJobFeedbackCommand.ts";

export class BlossomFileUploadedEvent implements IEvent {
    id!: string;
    url!: string;
}

@injectable()
export class BlossomFileUploadedEventHandler implements IEventHandler<BlossomFileUploadedEvent> {

    constructor(
        @inject("Logger") private logger: pino.Logger,
        @inject(PublishJobFeedbackCommand.name) private publishJobFeedbackCommandHandler: ICommandHandler<PublishJobFeedbackCommand>
    ) {
    }

    async execute(event: BlossomFileUploadedEvent): Promise<void> {
        // Get job request by file id
        const jobRequest = this.getJobRequestByFileIdHandler.execute({event.id});


        await this.publishJobFeedbackCommandHandler.execute({
            status: JobFeedBackStatus.Success,
            jobRequestId: jobRequest.id,
            statusExtraInfo: "Docker image uploaded to blossom.",
            relayHint: "wss://relay.stens.dev",
            content: event.url,
            customerPubKey: jobRequest.customerPubKey,
        })
    }
}