import {inject, injectable} from "tsyringe";
import type pino from "pino";
import ICommand from "../base/ICommand.ts";
import ICommandHandler from '../base/ICommandHandler.ts';
import { Address } from '@welshman/util';
import { simpleGit, type SimpleGit } from "simple-git";
import { exists } from "https://deno.land/std/fs/mod.ts";

export class CloneRepositoryCommand implements ICommand {
    cloneDir!: string;
    repoAddress!: string
    repoRef!: string
}

@injectable()
export class CloneRepositoryCommandHandler implements ICommandHandler<CloneRepositoryCommand> {

    constructor(
        @inject("Logger") private logger: pino.Logger,
    ) {
    }

    async execute(command: CloneRepositoryCommand): Promise<void> {
        this.logger.info(`cloning repository ${command.repoAddress} ref ${command.repoRef}`);

        let git: SimpleGit = simpleGit();
        let cloneUrl = command.repoAddress;

        if(command.repoAddress.startsWith("naddr")){
            const addr = Address.fromNaddr(command.repoAddress);
            cloneUrl = `nostr://${addr.pubkey}/${addr.identifier}`
        }

        if(!await exists(command.cloneDir)){
            await git.clone(cloneUrl, command.cloneDir);
        }

        git = simpleGit(command.cloneDir);
        await git.checkout(command.repoRef);
    }
}