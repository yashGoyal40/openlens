/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import React from "react";
import type { KubeObject } from "@k8slens/kube-object";
import type {
  ArgoApplicationCondition,
  ArgoApplicationDestination,
  ArgoApplicationSource,
  ArgoApplicationSpec,
  ArgoResourceStatus,
} from "../common/argo-cd-resources";
import type { StatusTone } from "../../../resource-views/renderer/components/status-badge";
import { StatusBadge } from "../../../resource-views/renderer/components/status-badge";
import { ObjectReferenceLink } from "../../../resource-views/renderer/components/object-reference-link";
import { ResourceTable } from "../../../resource-views/renderer/components/resource-table";
import { TimeAgo } from "../../renderer/gitops-view-helpers";

const syncStatusTones: Partial<Record<string, StatusTone>> = {
  Synced: "success",
  OutOfSync: "warning",
};

const healthStatusTones: Partial<Record<string, StatusTone>> = {
  Healthy: "success",
  Progressing: "info",
  Degraded: "error",
  Missing: "warning",
};

const operationPhaseTones: Partial<Record<string, StatusTone>> = {
  Succeeded: "success",
  Running: "info",
  Terminating: "warning",
  Failed: "error",
  Error: "error",
};

export const SyncStatusBadge = ({ status, tooltip }: { status: string | undefined; tooltip?: string }) => (
  <StatusBadge
    tone={syncStatusTones[status ?? ""] ?? "vague"}
    label={status ?? "Unknown"}
    tooltip={tooltip}
  />
);

export const HealthStatusBadge = ({ health }: { health: { status?: string; message?: string } | undefined }) => (
  <StatusBadge
    tone={healthStatusTones[health?.status ?? ""] ?? "vague"}
    label={health?.status ?? "Unknown"}
    tooltip={health?.message}
  />
);

export const OperationPhaseBadge = ({ phase, message }: { phase: string; message?: string }) => (
  <StatusBadge
    tone={operationPhaseTones[phase] ?? "vague"}
    label={phase}
    tooltip={message}
  />
);

export const getSources = (spec: Partial<ArgoApplicationSpec>): ArgoApplicationSource[] => (
  spec.sources?.length
    ? spec.sources
    : spec.source
      ? [spec.source]
      : []
);

export const formatSource = (source: ArgoApplicationSource) => [
  source.repoURL,
  source.path ?? source.chart,
  source.targetRevision && `@ ${source.targetRevision}`,
].filter(Boolean).join(" ");

export const formatSources = (sources: ArgoApplicationSource[]) => {
  const [first, ...others] = sources;

  if (!first) {
    return "";
  }

  return others.length
    ? `${formatSource(first)} (+${others.length} more)`
    : formatSource(first);
};

export const formatDestination = (destination: ArgoApplicationDestination | undefined) => {
  const cluster = destination?.name ?? destination?.server;

  return [cluster, destination?.namespace].filter(Boolean).join("/");
};

/**
 * Whether the destination is the cluster Argo CD runs in, so the resources it manages can be linked to
 */
export const isInClusterDestination = (destination: ArgoApplicationDestination | undefined) => (
  destination?.server === "https://kubernetes.default.svc"
  || destination?.name === "in-cluster"
);

export const ArgoConditions = ({ conditions }: { conditions: ArgoApplicationCondition[] | undefined }) => (
  <ResourceTable
    title="Conditions"
    rows={conditions}
    columns={[
      {
        title: "Type",
        value: condition => (
          <StatusBadge
            tone={condition.type.endsWith("Warning") ? "warning" : "error"}
            label={condition.type}
          />
        ),
      },
      { title: "Message", className: "wide", value: condition => condition.message },
      { title: "Last Transition", value: condition => <TimeAgo timestamp={condition.lastTransitionTime} /> },
    ]}
  />
);

export interface ArgoResourceLinkProps {
  resource: ArgoResourceStatus;
  parent: KubeObject;

  /**
   * Resources deployed to other clusters cannot be linked to
   */
  linkable: boolean;
}

export const ArgoResourceLink = ({ resource, parent, linkable }: ArgoResourceLinkProps) => (
  linkable
    ? (
      <ObjectReferenceLink
        parent={parent}
        reference={{
          kind: resource.kind,
          group: resource.group ?? "",
          name: resource.name,
          namespace: resource.namespace,
        }}
      />
    )
    : <>{resource.name}</>
);

export const formatGroupKind = ({ group, kind }: { group?: string; kind: string }) => (
  group ? `${kind}.${group}` : kind
);
