import { container } from 'tsyringe';
import pino from 'pino';
import pretty from 'pino-pretty';
import {registerCommandHandler, registerEventHandler, registerQueryHandler} from "./cqrs/base/cqrs.ts";
import { RelayProvider } from './RelayProvider.ts';
import {EventListenerRegistry} from "./listeners/EventListenerRegistry.ts";
import {IEventListenerRegistry} from "./listeners/IEventListenerRegistry.ts";
import {nostrNow} from "./utils/nostrEventUtils.ts";
import {EventPublisher, IEventPublisher} from './publisher/EventPublisher.ts';
import IEventHandler from "./cqrs/base/IEventHandler.ts";
import {CloneRepositoryCommand, CloneRepositoryCommandHandler} from "./cqrs/commands/CloneRepositoryCommand.ts";
import {GetRepoAddressQuery, GetRepoAddressQueryHandler} from "./cqrs/queries/GetRepoAddressQuery.ts";
import {
    PublishJobFeedbackCommand,
    PublishJobFeedbackCommandHandler
} from "./cqrs/commands/PublishJobFeedbackCommand.ts";
import {WorkflowRunRequestEvent, WorkflowRunRequestEventHandler} from "./cqrs/events/WorkflowRunRequestEvent.ts";
import {RunWorkflowCommand, RunPipelineCommandHandler} from "./cqrs/commands/RunWorkflowCommand.ts";
import {
    PublishNip89RecommendationCommand,
    PublishNip89RecommendationCommandHandler
} from "./cqrs/commands/PublishNip89Recommendation.ts";
import {Wallet} from "./money/wallet.ts";
import {CashRegister} from "./money/cashRegister.ts";
import Payout from "./money/payout.ts";

export async function startup() {
    const stream = pretty({
        levelFirst: true,
        colorize: true,
        ignore: "time,hostname,pid",
    });

    const logger = pino.pino(
        stream
    );
    logger.info("Running startup");

    container.registerInstance("Logger", logger);
    container.register(RelayProvider.name, { useClass: RelayProvider });
    container.register(EventPublisher.name, { useClass: EventPublisher });

    // CQRS registrations
    registerCommandHandler(PublishJobFeedbackCommand.name, PublishJobFeedbackCommandHandler)
    registerCommandHandler(CloneRepositoryCommand.name, CloneRepositoryCommandHandler)
    registerCommandHandler(RunWorkflowCommand.name, RunPipelineCommandHandler)
    registerCommandHandler(PublishNip89RecommendationCommand.name, PublishNip89RecommendationCommandHandler)

    registerQueryHandler(GetRepoAddressQuery.name, GetRepoAddressQueryHandler)

    registerEventHandler(WorkflowRunRequestEvent.name, WorkflowRunRequestEventHandler)

    container.registerSingleton(EventListenerRegistry.name, EventListenerRegistry);

    container.registerSingleton(Wallet.name, Wallet);
    container.registerSingleton(CashRegister.name, CashRegister);
    container.registerSingleton(Payout.name, Payout);

    logger.info("All services registered");

    setupListeners()

    logger.info("Starting cron services");

    container.resolve<Payout>(Payout.name).start();

    const publishNip89: PublishNip89RecommendationCommandHandler = container.resolve(PublishNip89RecommendationCommand.name)
    await Deno.cron("NIP-89 Announcements", {minute: {every: 1}}, async () => {
        await publishNip89.execute({})
    });

    logger.info("Startup completed");
}

function setupListeners() {
    const eventListenerRegistry: IEventListenerRegistry = container.resolve(EventListenerRegistry.name);
    var gitWatchFilters = [
        {
            kinds: [5600],
            limit: 1000,
            since: nostrNow()
        }
    ]

    const repoWatchRequestedEventHandler: IEventHandler<WorkflowRunRequestEvent> = container.resolve(WorkflowRunRequestEvent.name);
    eventListenerRegistry.add("watch-job-requests", gitWatchFilters, repoWatchRequestedEventHandler)
}
