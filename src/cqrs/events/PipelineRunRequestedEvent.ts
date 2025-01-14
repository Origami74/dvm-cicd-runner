import type pino from "pino";
import {inject, injectable} from "tsyringe";
import IEventHandler from '../base/IEventHandler.ts';
import IEvent from '../base/IEvent.ts';
import {NostrEvent} from '@nostrify/nostrify';
import {getParams, getTag} from "../../utils/nostrEventUtils.ts";
import { Address } from '@welshman/util';
import type ICommandHandler from "../base/ICommandHandler.ts";
import {CloneRepositoryCommand} from "../commands/CloneRepositoryCommand.ts";
import {util} from "npm:protobufjs@7.4.0";
import encode = util.base64.encode;
import {RunPipelineCommand} from "../commands/RunPipelineCommand.ts";

export class PipelineRunRequestedEvent implements IEvent {
    nostrEvent!: NostrEvent;
}

@injectable()
export class PipelineRunRequestedEventHandler implements IEventHandler<PipelineRunRequestedEvent> {

    constructor(
        @inject("Logger") private logger: pino.Logger,
        @inject(CloneRepositoryCommand.name) private cloneRepositoryCommandHandler: ICommandHandler<CloneRepositoryCommand>,
        @inject(RunPipelineCommand.name) private runPipelineCommandHandler: ICommandHandler<RunPipelineCommand>,
    ) {
    }

    async execute(event: PipelineRunRequestedEvent): Promise<void> {
        console.log(event.nostrEvent)
        const params = getParams(event.nostrEvent);

        const gitAddress = params.get("git_address")
        const gitRef = params.get("git_ref")
        const pipelineDefinitionFilePath = params.get("pipeline_filepath")
        if (gitRef === undefined || gitAddress === undefined) {
            console.log("missing parameter commit_hash");
            return;
        }

        try {
            // const iTag = getTag(event.nostrEvent, "i");
            let repoAddress: string;

            if(gitAddress.startsWith("naddr")) {
                repoAddress = gitAddress
            } else {
                repoAddress = gitAddress
            }

            const dir = `tmp/${event.nostrEvent.id}`;

            // Clone commit into tmp folder
            await this.cloneRepositoryCommandHandler.execute({cloneDir: dir, repoAddress: repoAddress, repoRef: gitRef})

            // Execute pipeline build
            await this.runPipelineCommandHandler.execute({jobRequest: event.nostrEvent, rootDir: dir, pipelineDefinitionFilePath: pipelineDefinitionFilePath})


            // Write output to result



        } catch (e){
            console.log(e)
            this.logger.error(e, "error when Building")
        }
    }
}