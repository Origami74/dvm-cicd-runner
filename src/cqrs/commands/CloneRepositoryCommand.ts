import {inject, injectable} from "tsyringe";
import type pino from "pino";
import ICommand from "../base/ICommand.ts";
import ICommandHandler from '../base/ICommandHandler.ts';
import { Address } from '@welshman/util';
import { simpleGit, type SimpleGit } from "simple-git";
import { exists } from "https://deno.land/std/fs/mod.ts";

export class CloneRepositoryCommand implements ICommand {
    cloneDir!: string;
    repoAddress!: Address
    commitHash!: string
}

@injectable()
export class CloneRepositoryCommandHandler implements ICommandHandler<CloneRepositoryCommand> {

    constructor(
        @inject("Logger") private logger: pino.Logger,
    ) {
    }

    async execute(command: CloneRepositoryCommand): Promise<void> {
        this.logger.info(`cloning repository ${command.repoAddress} commit ${command.commitHash}`);

        let git: SimpleGit = simpleGit();

        if(!await exists(command.cloneDir)){
            await git.clone(`nostr://${command.repoAddress.pubkey}/${command.repoAddress.identifier}`, command.cloneDir);
        }

        git = simpleGit(command.cloneDir);
        await git.checkout(command.commitHash);
    }
}