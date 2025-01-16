import {inject, injectable} from "tsyringe";
import type pino from "pino";
import ICommand from "../base/ICommand.ts";
import type ICommandHandler from '../base/ICommandHandler.ts';
import {EventListenerRegistry} from "../../listeners/EventListenerRegistry.ts";
import type {IEventListenerRegistry} from "../../listeners/IEventListenerRegistry.ts";
import fs from "node:fs";
import {
    JobFeedBackStatus,
    PublishJobFeedbackCommand,
    PublishJobFeedbackCommandHandler
} from "./PublishJobFeedbackCommand.ts";
import {NostrEvent} from '@nostrify/nostrify';
import {ACT_DEFAULT_IMAGE, ACT_EXECUTABLE_PATH} from "../../utils/env.ts";
import {copy, readerFromStreamReader} from "jsr:@std/io";

export class RunPipelineCommand implements ICommand {
    jobRequest!: NostrEvent
    rootDir!: string
    pipelineDefinitionFilePath!: string
}

@injectable()
export class RunPipelineCommandHandler implements ICommandHandler<RunPipelineCommand> {
    constructor(
        @inject("Logger") private logger: pino.Logger,
        @inject(EventListenerRegistry.name) private eventListenerRegistry: IEventListenerRegistry,
        @inject(PublishJobFeedbackCommand.name) private publishJobFeedbackCommandHandler: PublishJobFeedbackCommandHandler,
       ) {
    }

    async execute(command: RunPipelineCommand): Promise<void> {

        const fullPath = `${command.rootDir}/${command.pipelineDefinitionFilePath}`

        if(!fs.existsSync(fullPath)) {
            this.logger.info(`Pipeline ${fullPath} does not exist, run failed`);
            return;
        }

        const file = fs.readFileSync(fullPath, "utf8");

        // Run act runner
        this.logger.info(`Running workflow`);

        // notify customer that job started
        await this.publishJobFeedbackCommandHandler.execute({
            status: JobFeedBackStatus.Processing,
            jobRequest: command.jobRequest,
            statusExtraInfo: "Started running pipeline",
            content: "",
        })


        await new Deno.Command(Deno.execPath(), { args: ["cd", command.rootDir] }).output()

        // TODO: might cause issues with multiple runs in parallel
        Deno.chdir(command.rootDir)

        // https://nektosact.com/usage/index.html#workflows
        let cmd = new Deno.Command(
            `act`, {
                args: [`-W`, command.pipelineDefinitionFilePath, "-P", ACT_DEFAULT_IMAGE],
                stdout: "piped",
                stderr: "piped",
                stdin: "piped",
            }).spawn();


        copy(readerFromStreamReader(cmd.stdout.getReader()), Deno.stdout);
        copy(readerFromStreamReader(cmd.stderr.getReader()), Deno.stderr);

        const result = await cmd.status

        await this.publishJobFeedbackCommandHandler.execute({
            status: result.code == 0 ? JobFeedBackStatus.Success : JobFeedBackStatus.Error,
            jobRequest: command.jobRequest,
            statusExtraInfo: "Success",
            content: "TODO stream to string output //new TextDecoder().decode(stdout)", // TODO get output
        })


        // broadcast
        this.logger.info(`File contents: ${file}`)
    }
}