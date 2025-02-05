import {NostrEvent} from "@nostrify/nostrify";
import {getParams} from "./utils/dvm.ts";
import {getTagValue} from "npm:@welshman/util@0.0.60";

export interface WorkflowRunRequest {
    repositoryAddress: string
    repositoryRef: string
    workflowFilePath: string
    workflowTimeOut: number
    payment: string | undefined
}


export function workflowRunRequestFromNostrEvent(event: NostrEvent): WorkflowRunRequest {
    const params = getParams(event);

    const repoAddress = requireParam(params, "git_address")
    const repoRef = requireParam(params, "git_ref")
    const workFlowFilePath = requireParam(params, "workflow_filepath")
    const workflowTimeOut = Number(requireParam(params, "workflow_timeout"))

    if(isNaN(workflowTimeOut)){
        throw new Error("workflow_timeout must be a number")
    }

    const payment = getTagValue("payment", event.tags)

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
