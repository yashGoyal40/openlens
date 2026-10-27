/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import React from "react";
import { bytesToUnits } from "@k8slens/utilities";
import type { KubeObject } from "@k8slens/kube-object";
import type {
  FluxCrossNamespaceObjectReference,
  FluxDependencyReference,
  FluxInventoryEntry,
  FluxObject,
  FluxSource,
} from "../common/flux-resources";
import { fluxSourceGroup } from "../common/flux-resources";
import type { ResourceColumn, ResourceDetail } from "../../../resource-views/renderer/resource-view-definition";
import { getPrimaryCondition, ResourceConditions } from "../../../resource-views/renderer/components/resource-conditions";
import { StatusBadge } from "../../../resource-views/renderer/components/status-badge";
import { ObjectReferenceLink } from "../../../resource-views/renderer/components/object-reference-link";
import { DurationAbsoluteTimestamp } from "../../../../renderer/components/events/duration-absolute";
import { shortenRevision, sortByTimestamp, TimeAgo } from "../../renderer/gitops-view-helpers";

/**
 * Condition types of the Flux controllers that are healthy when false
 */
export const fluxNegativePolarityTypes = [
  "Stalled",
  "Reconciling",
  "FetchFailed",
  "BuildFailed",
  "StorageOperationFailed",
  "ArtifactOutdated",
  "IncludeUnavailable",
  "Remediated",
];

export const getReadyCondition = (object: FluxObject) => getPrimaryCondition(object.status?.conditions, ["Ready"]);

export const ReadyBadge = ({ object }: { object: FluxObject }) => {
  const ready = getReadyCondition(object);

  if (!ready) {
    return (
      <StatusBadge
        tone="vague"
        label="Unknown"
        tooltip="The controller has not reported a Ready condition yet"
      />
    );
  }

  return (
    <StatusBadge
      tone={ready.status === "True" ? "success" : ready.status === "False" ? "error" : "warning"}
      label={ready.reason ?? (ready.status === "True" ? "Ready" : "Not ready")}
      tooltip={ready.message}
    />
  );
};

export const SuspendedBadge = ({ object }: { object: FluxObject }) => (
  object.spec.suspend
    ? <StatusBadge tone="warning" label="Yes" />
    : <>No</>
);

/**
 * The status columns shared by all Flux kinds
 */
export const getFluxColumns = <Obj extends FluxObject>(): ResourceColumn<Obj>[] => [
  {
    id: "ready",
    title: "Ready",
    value: object => <ReadyBadge object={object} />,
    sortBy: object => getReadyCondition(object)?.status,
    search: object => getReadyCondition(object)?.reason,
  },
  {
    id: "suspended",
    title: "Suspended",
    size: "narrow",
    value: object => <SuspendedBadge object={object} />,
    sortBy: object => object.spec.suspend ? 1 : 0,
  },
  {
    id: "interval",
    title: "Interval",
    size: "narrow",
    value: object => object.spec.interval,
  },
];

/**
 * The status details shared by all Flux kinds
 */
export const getFluxDetails = <Obj extends FluxObject>(): ResourceDetail<Obj>[] => [
  {
    name: "Ready",
    value: object => <ReadyBadge object={object} />,
  },
  {
    name: "Message",
    value: object => getReadyCondition(object)?.message,
    hidden: object => !getReadyCondition(object)?.message,
  },
  {
    name: "Suspended",
    value: object => object.spec.suspend ? "Yes" : "No",
  },
  {
    name: "Interval",
    value: object => object.spec.interval,
    hidden: object => !object.spec.interval,
  },
  {
    name: "Timeout",
    value: object => object.spec.timeout,
    hidden: object => !object.spec.timeout,
  },
];

export const FluxConditions = ({ object }: { object: FluxObject }) => (
  <ResourceConditions
    conditions={object.status?.conditions}
    negativePolarityTypes={fluxNegativePolarityTypes}
  />
);

const getGroup = (apiVersion: string | undefined) => apiVersion?.split("/")[0];

export interface FluxObjectReferenceLinkProps {
  reference: FluxCrossNamespaceObjectReference;
  parent: KubeObject;

  /**
   * Used when the reference has no `apiVersion`
   */
  defaultGroup?: string;
}

export const FluxObjectReferenceLink = ({ reference, parent, defaultGroup = fluxSourceGroup }: FluxObjectReferenceLinkProps) => (
  <ObjectReferenceLink
    parent={parent}
    showKind
    reference={{
      kind: reference.kind,
      group: getGroup(reference.apiVersion) ?? defaultGroup,
      name: reference.name,
      namespace: reference.namespace,
    }}
  />
);

export const DependsOnLinks = ({ dependencies, parent, kind, group }: {
  dependencies: FluxDependencyReference[] | undefined;
  parent: KubeObject;
  kind: string;
  group: string;
}) => (
  <>
    {dependencies?.map(dependency => (
      <div key={`${dependency.namespace ?? ""}/${dependency.name}`}>
        <ObjectReferenceLink
          parent={parent}
          reference={{ kind, group, name: dependency.name, namespace: dependency.namespace }}
        />
      </div>
    ))}
  </>
);

export interface FluxInventoryObject {
  namespace?: string;
  name: string;
  group: string;
  kind: string;
  version: string;
}

/**
 * Parses an inventory entry id formatted as "<namespace>_<name>_<group>_<kind>", where the namespace and group may be
 * empty and colons in the name are encoded as "__"
 */
export const parseInventoryEntry = ({ id, v }: FluxInventoryEntry): FluxInventoryObject | undefined => {
  const namespaceEnd = id.indexOf("_");
  const kindStart = id.lastIndexOf("_");
  const groupStart = kindStart > 0 ? id.lastIndexOf("_", kindStart - 1) : -1;

  if (namespaceEnd < 0 || groupStart <= namespaceEnd) {
    return undefined;
  }

  return {
    namespace: id.slice(0, namespaceEnd) || undefined,
    name: id.slice(namespaceEnd + 1, groupStart).replace(/__/g, ":"),
    group: id.slice(groupStart + 1, kindStart),
    kind: id.slice(kindStart + 1),
    version: v,
  };
};

export const getSourceRevision = (source: FluxSource) => source.status?.artifact?.revision;
const getLastUpdateTime = (source: FluxSource) => source.status?.artifact?.lastUpdateTime;

/**
 * The artifact columns shared by all Flux sources
 */
export const getSourceColumns = <Source extends FluxSource>(): ResourceColumn<Source>[] => [
  {
    id: "revision",
    title: "Revision",
    value: source => shortenRevision(getSourceRevision(source)),
    search: getSourceRevision,
  },
  {
    id: "last-update",
    title: "Last Update",
    value: source => <TimeAgo timestamp={getLastUpdateTime(source)} />,
    sortBy: source => sortByTimestamp(getLastUpdateTime(source)),
  },
];

/**
 * The artifact details shared by all Flux sources
 */
export const getSourceDetails = <Source extends FluxSource>(): ResourceDetail<Source>[] => [
  {
    name: "Artifact Revision",
    value: source => getSourceRevision(source),
    hidden: source => !getSourceRevision(source),
  },
  {
    name: "Artifact Digest",
    value: source => source.status?.artifact?.digest ?? source.status?.artifact?.checksum,
    hidden: source => !source.status?.artifact?.digest && !source.status?.artifact?.checksum,
  },
  {
    name: "Artifact Updated",
    value: source => <DurationAbsoluteTimestamp timestamp={getLastUpdateTime(source)} />,
    hidden: source => !getLastUpdateTime(source),
  },
  {
    name: "Artifact Size",
    value: source => bytesToUnits(source.status?.artifact?.size ?? 0),
    hidden: source => source.status?.artifact?.size === undefined,
  },
  {
    name: "Artifact URL",
    value: source => source.status?.artifact?.url ?? source.status?.url,
    hidden: source => !source.status?.artifact?.url && !source.status?.url,
  },
];
