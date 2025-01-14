import { container } from 'tsyringe';
import pino from 'pino';
import {registerCommandHandler, registerEventHandler, registerQueryHandler} from "./cqrs/base/cqrs.ts";
import {RepoWatchRequestedEvent, RepoWatchRequestedEventHandler} from "./cqrs/events/RepoWatchRequestedEvent.ts";
import {PublishTextNoteCommand, PublishTextNoteCommandHandler} from "./cqrs/commands/PublishTextNoteCommand.ts";
import { RelayProvider } from './RelayProvider.ts';
import {WatchRepositoryCommand, WatchRepositoryCommandHandler} from "./cqrs/commands/WatchRepositoryCommand.ts";
import {GitPatchEvent, GitPatchEventHandler} from "./cqrs/events/GitPatchEvent.ts";
import {GitStateAnnouncementEvent, GitStateAnnouncementEventHandler} from "./cqrs/events/GitStateAnnouncementEvent.ts";
import {EventListenerRegistry} from "./listeners/EventListenerRegistry.ts";
import {IEventListenerRegistry} from "./listeners/IEventListenerRegistry.ts";
import {nostrNow} from "./utils/nostrEventUtils.ts";
import {EventPublisher, IEventPublisher} from './publisher/EventPublisher.ts';
import {StartBuildCommand, StartBuildCommandHandler} from "./cqrs/commands/StartBuildCommand.ts";
import IEventHandler from "./cqrs/base/IEventHandler.ts";
import {DockerBuildRequestedEvent, DockerBuildRequestedEventHandler} from "./cqrs/events/BuildRequestedEvent.ts";
import {CloneRepositoryCommand, CloneRepositoryCommandHandler} from "./cqrs/commands/CloneRepositoryCommand.ts";
import {DockerBuildCommand, DockerBuildCommandHandler} from "./cqrs/commands/DockerBuildCommand.ts";
import {UploadToBlossomCommand, UploadToBlossomCommandHandler} from './cqrs/commands/UploadToBlossomCommand.ts';
import {GetStateAnnouncementQuery, GetStateAnnouncementQueryHandler} from "./cqrs/queries/GetStateAnnouncementQuery.ts";
import {GetWatchSubscriptionQuery, GetWatchSubscriptionQueryHandler} from "./cqrs/queries/GetWatchSubscriptionQuery.ts";
import {GetRepoAddressQuery, GetRepoAddressQueryHandler} from "./cqrs/queries/GetRepoAddressQuery.ts";
import {
    SaveWatchSubscriptionCommand,
    SaveWatchSubscriptionCommandHandler
} from "./cqrs/commands/SaveWatchSubscriptionCommand.ts";
import {
    PublishJobFeedbackCommand,
    PublishJobFeedbackCommandHandler
} from "./cqrs/commands/PublishJobFeedbackCommand.ts";

export async function startup() {
    const logger = pino.pino();
    logger.info("Running startup");

    container.registerInstance("Logger", logger);
    container.register(RelayProvider.name, { useClass: RelayProvider });
    container.register(EventPublisher.name, { useClass: EventPublisher });

    // CQRS registrations
    registerEventHandler(RepoWatchRequestedEvent.name, RepoWatchRequestedEventHandler);
    registerEventHandler(GitPatchEvent.name, GitPatchEventHandler);
    registerEventHandler(GitStateAnnouncementEvent.name, GitStateAnnouncementEventHandler);
    registerEventHandler(DockerBuildRequestedEvent.name, DockerBuildRequestedEventHandler);

    registerCommandHandler(PublishTextNoteCommand.name, PublishTextNoteCommandHandler)
    registerCommandHandler(PublishJobFeedbackCommand.name, PublishJobFeedbackCommandHandler)

    registerCommandHandler(WatchRepositoryCommand.name, WatchRepositoryCommandHandler)
    registerCommandHandler(StartBuildCommand.name, StartBuildCommandHandler)
    registerCommandHandler(CloneRepositoryCommand.name, CloneRepositoryCommandHandler)
    registerCommandHandler(DockerBuildCommand.name, DockerBuildCommandHandler)
    registerCommandHandler(UploadToBlossomCommand.name, UploadToBlossomCommandHandler)
    registerCommandHandler(SaveWatchSubscriptionCommand.name, SaveWatchSubscriptionCommandHandler)

    registerQueryHandler(GetStateAnnouncementQuery.name, GetStateAnnouncementQueryHandler)
    registerQueryHandler(GetRepoAddressQuery.name, GetRepoAddressQueryHandler)
    registerQueryHandler(GetWatchSubscriptionQuery.name, GetWatchSubscriptionQueryHandler)

    container.registerSingleton(EventListenerRegistry.name, EventListenerRegistry);

    logger.info("All services registered");

    setupListeners()

    logger.info("Startup completed");
}

function setupListeners() {
    const eventListenerRegistry: IEventListenerRegistry = container.resolve(EventListenerRegistry.name);
    var gitWatchFilters = [
        {
            kinds: [68001],
            "#j": ["git-proposal-commit-watch"],
            limit: 1000,
            since: nostrNow()
        }
    ]

    const repoWatchRequestedEventHandler: IEventHandler<RepoWatchRequestedEvent> = container.resolve(RepoWatchRequestedEvent.name);
    eventListenerRegistry.add("watch-job-requests", gitWatchFilters, repoWatchRequestedEventHandler)

    var dockerBuildFilters = [
        {
            kinds: [68001],
            "#j": ["docker-build"],
            limit: 1000,
            since: nostrNow()
        }
    ]
    const dockerBuildRequestedEventHandler: IEventHandler<DockerBuildRequestedEvent> = container.resolve(DockerBuildRequestedEvent.name);
    eventListenerRegistry.add("docker-build-requests", dockerBuildFilters, dockerBuildRequestedEventHandler)
}
