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
import {ACT_DEFAULT_IMAGE, GITHUB_TOKEN} from "../../utils/env.ts";
import {copy, readerFromStreamReader} from "jsr:@std/io";

export class RunWorkflowCommand implements ICommand {
    jobRequest!: NostrEvent
    rootDir!: string
    workflowFilePath!: string
}

@injectable()
export class RunPipelineCommandHandler implements ICommandHandler<RunWorkflowCommand> {
    constructor(
        @inject("Logger") private logger: pino.Logger,
        @inject(EventListenerRegistry.name) private eventListenerRegistry: IEventListenerRegistry,
        @inject(PublishJobFeedbackCommand.name) private publishJobFeedbackCommandHandler: PublishJobFeedbackCommandHandler,
       ) {
    }

    async execute(command: RunWorkflowCommand): Promise<void> {

        const fullPath = `${command.rootDir}/${command.workflowFilePath}`

        if(!fs.existsSync(fullPath)) {
            this.logger.info(`Pipeline ${fullPath} does not exist, run failed`);
            return;
        }

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
        const decoder = new TextDecoder();

        // TODO: might cause issues with multiple runs in parallel
        Deno.chdir(command.rootDir)

        // https://nektosact.com/usage/index.html#workflows
        let cmd = new Deno.Command(
            `act`, {
                args: [
                    '-s', `GITHUB_TOKEN=${GITHUB_TOKEN}`,
                    `-W`, command.workflowFilePath,
                    "-P", ACT_DEFAULT_IMAGE,
                    "--directory", "."
                ],
                stdout: "piped",
                stderr: "piped",
                stdin: "piped",
            }).spawn();

        const stdoutReader = cmd.stdout.getReader();
        const stderrReader = cmd.stderr.getReader();

        let fullTextOutput = ""
        stdoutReader.read().then(async function processText({done, value}) {
            const stream = await stdoutReader.read();

            if (done) return;

            const line = decoder.decode(value)
            fullTextOutput += line + "\n";
            return await processText(stream);
        })

        stderrReader.read().then(async function processText({done, value}) {
            const stream = await stdoutReader.read();

            if (done) return;

            const line = decoder.decode(value)
            fullTextOutput += line + "\n";
            return await processText(stream);
        })

        copy(readerFromStreamReader(stdoutReader), Deno.stdout);
        copy(readerFromStreamReader(stderrReader), Deno.stderr);

        let jobStatus: JobFeedBackStatus;
        let statusExtraInfo = ""
        try{
            const result = await cmd.status

            this.logger.info(`Finished workflow`);

            jobStatus = JobFeedBackStatus.Success
            statusExtraInfo = result.code == 0 ? "PipelineSuccess" : "PipelineError"
        } catch (e) {
            console.error("Error executing pipeline", e);
            jobStatus = JobFeedBackStatus.Error
            statusExtraInfo = "Internal error occurred."
        }

        // broadcast result
        await this.publishJobFeedbackCommandHandler.execute({
            status: jobStatus,
            jobRequest: command.jobRequest,
            statusExtraInfo: statusExtraInfo,
            content: fullTextOutput,
        })
    }
}