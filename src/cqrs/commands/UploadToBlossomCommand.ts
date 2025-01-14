import {inject, injectable} from "tsyringe";
import type pino from "pino";
import ICommand from "../base/ICommand.ts";
import {NSecSigner} from '@nostrify/nostrify';
import { BlossomClient } from "blossom-client-sdk";
import path from "node:path";
import {PublishTextNoteCommand} from "./PublishTextNoteCommand.ts";
import type ICommandHandler from '../base/ICommandHandler.ts';
import {EventPublisher, IEventPublisher} from "../../publisher/EventPublisher.ts";
import {GitPatchEvent} from "../events/GitPatchEvent.ts";
import {BlossomFileUploadedEvent} from "../events/BlossomFileUploadedEvent.ts";


export class UploadToBlossomCommand implements ICommand {
    id!: string
    filePath!: string
}

@injectable()
export class UploadToBlossomCommandHandler implements ICommandHandler<UploadToBlossomCommand> {

    constructor(
        @inject("Logger") private logger: pino.Logger,
        @inject(EventPublisher.name) private eventPublisher: IEventPublisher,
        @inject(PublishTextNoteCommand.name) private publishTextNoteCommandHandler: ICommandHandler<PublishTextNoteCommand>,
    ) {
    }

    async execute(command: UploadToBlossomCommand): Promise<void> {
        this.logger.info(`Uploading file ${command.filePath} to Blossom`);

        const secretKey: string = Deno.env.get("NSEC_HEX") || ""; // TODO throw new Error("NSEC_HEX env var not set");
        const nSecSigner = new NSecSigner(secretKey);

        const fileName = path.basename(command.filePath);
        const data = await Deno.readFile(command.filePath);
        const blob = new Blob([data], {type: 'application/x-tar'});

        try{
            const client = new BlossomClient("https://blossom.stens.dev", (event) => nSecSigner.signEvent(event));

            const uploadAuthEvent = await client.getUploadAuth(blob, 'Upload ' + fileName)
            const result = await client.uploadBlob(blob, uploadAuthEvent)

            const url = result.url

            // TODO: this command should not be responsible for this, move this out
            await this.publishTextNoteCommandHandler.execute({message: `Docker Build completed for file ${fileName}, download it here: ${url}`})

            console.log(result)

            const event: BlossomFileUploadedEvent = {
                id: command.id,
                url: url
            }

            await this.eventPublisher.publishInternal(GitPatchEvent.name, event)
        } catch (e) {
            console.log(e)
        }

    }
}