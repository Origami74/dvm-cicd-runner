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
import {getTagValues} from "npm:@welshman/util@0.0.60";
import {CloneRepositoryCommand} from "./CloneRepositoryCommand.ts";
import {nostrNow} from "../../utils/nostrEventUtils.ts";
import {type IWallet, Wallet} from "../../money/wallet.ts";
import {calculateChange} from "../../utils/money.ts";

export class RunWorkflowCommand implements ICommand {
    jobRequest!: NostrEvent
    rootDir!: string
    workflowFilePath!: string
    repositoryAddress!: string
    repositoryRef!: string
    receivedPaymentAmount!: number
}

@injectable()
export class RunWorkflowCommandHandler implements ICommandHandler<RunWorkflowCommand> {
    constructor(
        @inject("Logger") private logger: pino.Logger,
        @inject(EventListenerRegistry.name) private eventListenerRegistry: IEventListenerRegistry,
        @inject(PublishJobFeedbackCommand.name) private publishJobFeedbackCommandHandler: PublishJobFeedbackCommandHandler,
        @inject(CloneRepositoryCommand.name) private cloneRepositoryCommandHandler: ICommandHandler<CloneRepositoryCommand>,
        @inject(Wallet.name) private wallet: IWallet,
       ) {
    }

    async execute(command: RunWorkflowCommand): Promise<void> {
        const workflowStartedAt = nostrNow()

        const fullPath = `${command.rootDir}/${command.workflowFilePath}`
        await this.cloneRepositoryCommandHandler.execute({cloneDir: command.rootDir, repoAddress: command.repositoryAddress, repoRef: command.repositoryRef})

        if(!fs.existsSync(fullPath)) {
            this.logger.info(`Workflow ${fullPath} does not exist, run failed`);
            await this.sendPartialResult(command, `Workflow ${command.workflowFilePath} does not exist, run failed`)
            await this.sendJobResult(command, workflowStartedAt,false)
            return;
        }

        // Run act runner
        this.logger.info(`Running workflow`);

        // notify customer that job started
        await this.publishJobFeedbackCommandHandler.execute({
            status: JobFeedBackStatus.Processing,
            jobRequest: command.jobRequest,
            addressPointers: getTagValues("a", command.jobRequest.tags),
            statusExtraInfo: "Started running workflow",
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

        const maxSecBetweenPartials = 5
        let lastPartialTime = nostrNow();
        let lastSentLineIndex = -1;
        let unsentLineCount = 0;
        const lines: string[] = []

        const processStream = async ({done, value}: ReadableStreamReadResult<Uint8Array>) => {
            const stream = await stdoutReader.read();

            // read line if it has a value
            if(value !== undefined){
                const lineStr = decoder.decode(value)
                lines.push(lineStr);
                unsentLineCount++;
            }

            // send if the stream is closed, or if linecount/timer expires
            if(done || unsentLineCount >= 25 || nostrNow() - lastPartialTime > maxSecBetweenPartials){
                await this.sendPartialResult(command, lines.join())
                lastSentLineIndex = lastSentLineIndex + unsentLineCount;
                lastPartialTime = nostrNow();
                unsentLineCount = 0
            }

            if (done) {
                return;
            }

            return await processStream(stream); // Continue reading stream
        };

        stdoutReader.read().then((readResult) => processStream(readResult))
        stderrReader.read().then((readResult) => processStream(readResult))

        copy(readerFromStreamReader(stdoutReader), Deno.stdout);
        copy(readerFromStreamReader(stderrReader), Deno.stderr);

        const result = await cmd.status
        const jobSucceeded = result.code == 0 ? true : false

        await this.sendJobResult(command, workflowStartedAt, jobSucceeded)

        this.logger.info(`Finished workflow`);
    }


    private async sendPartialResult(command: RunWorkflowCommand, content: string) {
        await this.publishJobFeedbackCommandHandler.execute({
            status: JobFeedBackStatus.Partial,
            jobRequest: command.jobRequest,
            statusExtraInfo: "",
            addressPointers: getTagValues("a", command.jobRequest.tags),
            content: content
        })
    }

    private async sendJobResult(command: RunWorkflowCommand, workflowStartedAt: number, jobSucceeded: boolean) {

        // Get the change
        // const changeAmount = calculateChange(workflowStartedAt, command.receivedPaymentAmount)
        // this.logger.info(`Returning ${changeAmount} in change to customer`);
        // const changeToken = await this.wallet.withdrawAmountAsToken(changeAmount)

        await this.publishJobFeedbackCommandHandler.execute({
            status: JobFeedBackStatus.Success,
            jobRequest: command.jobRequest,
            statusExtraInfo: jobSucceeded === true ? "WorkflowSuccess" : "WorkflowError",
            addressPointers: getTagValues("a", command.jobRequest.tags),
            // paymentChange: changeToken,
        })
    }
}