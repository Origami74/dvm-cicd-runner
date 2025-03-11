import {NostrEvent} from "@nostrify/nostrify";
import {getParams} from "./utils/dvm.ts";
import {NSecSigner} from '@nostrify/nostrify';
import {NOSTR_PRIVATE_KEY} from "./utils/env.ts";
import {unlockHiddenTags, getHiddenTags, EventEncryptionMethod} from "applesauce-core/helpers";

// Tell applesauce that this kind uses nip44
EventEncryptionMethod[5600] = "nip44"

export interface WorkflowRunRequest {
    repositoryAddress: string
    repositoryRef: string
    workflowFilePath: string
    workflowTimeOut: number
    payment: string | undefined
}


export async function workflowRunRequestFromNostrEvent(event: NostrEvent): Promise<WorkflowRunRequest> {
    const params = getParams(event);

    const repoAddress = requireParam(params, "git_address")
    const repoRef = requireParam(params, "git_ref")
    const workFlowFilePath = requireParam(params, "workflow_filepath")
    const workflowTimeOut = Number(requireParam(params, "workflow_timeout"))

    if(isNaN(workflowTimeOut)){
        throw new Error("workflow_timeout must be a number")
    }

    let payment = undefined;

    const signer = new NSecSigner(NOSTR_PRIVATE_KEY);
    try{
        await unlockHiddenTags(event, signer)

        const hiddenTags = getHiddenTags(event)!

        payment = hiddenTags.find(t => t[0] === "payment")?.[1]
    } catch(error){
        console.warn("Error decrypting hidden tags", error)
    }

    return {
        repositoryAddress: repoAddress,
        repositoryRef: repoRef,
        workflowFilePath: workFlowFilePath,
        workflowTimeOut: workflowTimeOut,
        payment: payment,
    }
}

function requireParam(params: Map<string,string>, paramName: string): string {
    const paramValue = params.get(paramName);
    if(paramValue) {
        return paramValue;
    }

    throw new Error(`missing parameter '${paramName}'`);
}
