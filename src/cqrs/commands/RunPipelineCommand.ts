import {inject, injectable} from "tsyringe";
import type pino from "pino";
import ICommand from "../base/ICommand.ts";
import type ICommandHandler from '../base/ICommandHandler.ts';
import { Address } from '@welshman/util';
import type IEventHandler from "../base/IEventHandler.ts";
import {GitPatchEvent} from "../events/GitPatchEvent.ts";
import {nostrNow} from "../../utils/nostrEventUtils.ts";
import { GitStateAnnouncementEvent } from '../events/GitStateAnnouncementEvent.ts';
import {EventListenerRegistry} from "../../listeners/EventListenerRegistry.ts";
import type {IEventListenerRegistry} from "../../listeners/IEventListenerRegistry.ts";

export class RunPipelineCommand implements ICommand {
    repoAddress!: Address
    branchName!: string
    watchUntil!: number
}

@injectable()
export class RunPipelineCommandHandler implements ICommandHandler<RunPipelineCommand> {
    constructor(
        @inject("Logger") private logger: pino.Logger,
        @inject(EventListenerRegistry.name) private eventListenerRegistry: IEventListenerRegistry,
        @inject(GitStateAnnouncementEvent.name) private gitStateAnnouncementEventHandler: IEventHandler<GitStateAnnouncementEvent>,
        @inject(GitPatchEvent.name) private gitPatchEventHandler: IEventHandler<GitPatchEvent>,
       ) {
    }

    async execute(command: RunPipelineCommand): Promise<void> {
        // subscribe to events for repository
        const repoKind = command.repoAddress.kind;
        const repoOwnerPubkey = command.repoAddress.pubkey;
        const repoIdentifier = command.repoAddress.identifier;

        // broadcast
        this.logger.info(`Started listening to repo: ${command.repoAddress} (${command.repoAddress.toNaddr})`)
    }
}