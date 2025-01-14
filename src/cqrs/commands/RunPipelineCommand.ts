import {inject, injectable} from "tsyringe";
import type pino from "pino";
import ICommand from "../base/ICommand.ts";
import type ICommandHandler from '../base/ICommandHandler.ts';
import { Address } from '@welshman/util';
import {EventListenerRegistry} from "../../listeners/EventListenerRegistry.ts";
import type {IEventListenerRegistry} from "../../listeners/IEventListenerRegistry.ts";
import fs from "node:fs";

export class RunPipelineCommand implements ICommand {
    rootDir!: Address
    pipelineDefinitionFilePath!: string
}

@injectable()
export class RunPipelineCommandHandler implements ICommandHandler<RunPipelineCommand> {
    constructor(
        @inject("Logger") private logger: pino.Logger,
        @inject(EventListenerRegistry.name) private eventListenerRegistry: IEventListenerRegistry,
       ) {
    }

    async execute(command: RunPipelineCommand): Promise<void> {

        const fullPath = `${command.rootDir}/${command.pipelineDefinitionFilePath}`

        if(!fs.existsSync(fullPath)) {
            this.logger.info(`Pipeline ${fullPath} does not exist, run failed`);
            return;
        }

        const file = fs.readFileSync(fullPath, "utf8");


        // broadcast
        this.logger.info(`File contents: ${file}`)
    }
}