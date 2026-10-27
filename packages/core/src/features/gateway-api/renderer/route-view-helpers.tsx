/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import React from "react";
import type { KubeObject } from "@k8slens/kube-object";
import type { AnyRoute, BackendReference, ParentReference, RouteParentStatus, RouteRule } from "../common/gateway-api-resources";
import type { ResourceColumn, ResourceDetail } from "../../resource-views/renderer/resource-view-definition";
import { ObjectReferenceLink } from "../../resource-views/renderer/components/object-reference-link";
import { StatusBadge } from "../../resource-views/renderer/components/status-badge";
import { ConditionBadges } from "../../resource-views/renderer/components/resource-conditions";
import { ResourceTable } from "../../resource-views/renderer/components/resource-table";

const gatewayApiGroup = "gateway.networking.k8s.io";

export const formatParentRef = (ref: ParentReference) => [
  ref.name,
  ref.sectionName && `/${ref.sectionName}`,
  ref.port && `:${ref.port}`,
].filter(Boolean).join("");

export const ParentRefLink = ({ reference, parent }: { reference: ParentReference; parent: KubeObject }) => (
  <ObjectReferenceLink
    parent={parent}
    reference={{
      kind: reference.kind ?? "Gateway",
      group: reference.group ?? gatewayApiGroup,
      name: reference.name,
      namespace: reference.namespace,
    }}
  />
);

export const BackendRefLink = ({ reference, parent }: { reference: BackendReference; parent: KubeObject }) => (
  <>
    <ObjectReferenceLink
      parent={parent}
      showKind={Boolean(reference.kind && reference.kind !== "Service")}
      reference={{
        kind: reference.kind ?? "Service",
        group: reference.group ?? "",
        name: reference.name,
        namespace: reference.namespace,
      }}
    />
    {reference.port !== undefined && `:${reference.port}`}
    {reference.weight !== undefined && ` (weight ${reference.weight})`}
  </>
);

const isParentStatusHealthy = (parentStatus: RouteParentStatus) => (
  ["Accepted", "ResolvedRefs"].every(type => (
    parentStatus.conditions?.find(condition => condition.type === type)?.status !== "False"
  ))
  && parentStatus.conditions?.some(condition => condition.type === "Accepted" && condition.status === "True")
);

export const RouteStatusBadge = ({ route }: { route: AnyRoute }) => {
  const parents = route.status?.parents ?? [];

  if (parents.length === 0) {
    return (
      <StatusBadge
        tone="warning"
        label="Pending"
        tooltip="No gateway has reported a status for this route yet" />
    );
  }

  const unhealthy = parents.filter(parentStatus => !isParentStatusHealthy(parentStatus));

  if (unhealthy.length === 0) {
    return <StatusBadge tone="success" label="Accepted" />;
  }

  const reasons = unhealthy.flatMap(parentStatus => (
    parentStatus.conditions
      ?.filter(condition => condition.status !== "True")
      .map(condition => `${formatParentRef(parentStatus.parentRef)}: ${condition.type} ${condition.reason ?? ""} ${condition.message ?? ""}`)
      ?? []
  ));

  return (
    <StatusBadge
      tone="error"
      label="Not accepted"
      tooltip={reasons.join("\n")} />
  );
};

const countBackends = (rules: RouteRule[] | undefined) => (
  rules?.reduce((count, rule) => count + (rule.backendRefs?.length ?? 0), 0) ?? 0
);

export const getRouteColumns = <Route extends AnyRoute>({ withHostnames }: { withHostnames: boolean }): ResourceColumn<Route>[] => [
  {
    id: "parents",
    title: "Parents",
    size: "wide",
    value: route => (
      route.spec.parentRefs?.map((ref, index) => (
        <React.Fragment key={index}>
          {index > 0 && ", "}
          <ParentRefLink reference={ref} parent={route} />
        </React.Fragment>
      ))
    ),
    search: route => route.spec.parentRefs?.map(ref => ref.name),
  },
  ...(withHostnames
    ? [{
      id: "hostnames",
      title: "Hostnames",
      size: "wide" as const,
      value: (route: Route) => route.spec.hostnames?.join(", "),
      search: (route: Route) => route.spec.hostnames,
    }]
    : []),
  {
    id: "rules",
    title: "Rules",
    size: "narrow",
    value: route => route.spec.rules?.length ?? 0,
    sortBy: route => route.spec.rules?.length ?? 0,
  },
  {
    id: "backends",
    title: "Backends",
    size: "narrow",
    value: route => countBackends(route.spec.rules),
    sortBy: route => countBackends(route.spec.rules),
  },
  {
    id: "status",
    title: "Status",
    value: route => <RouteStatusBadge route={route} />,
  },
];

export const getRouteDetails = <Route extends AnyRoute>({ withHostnames }: { withHostnames: boolean }): ResourceDetail<Route>[] => [
  {
    name: "Hostnames",
    value: route => route.spec.hostnames?.join(", "),
    hidden: route => !withHostnames || !route.spec.hostnames?.length,
  },
  {
    name: "Status",
    value: route => <RouteStatusBadge route={route} />,
  },
];

export const RouteParentsAndRules = ({ route, renderMatch }: { route: AnyRoute; renderMatch?: (match: unknown) => string }) => (
  <>
    <ResourceTable
      title="Parents"
      rows={route.spec.parentRefs}
      columns={[
        { title: "Parent", value: ref => <ParentRefLink reference={ref} parent={route} /> },
        { title: "Section / Port", value: ref => [ref.sectionName, ref.port].filter(Boolean).join(" : ") },
        {
          title: "Status",
          value: ref => {
            const parentStatus = route.status?.parents?.find(status => (
              status.parentRef.name === ref.name
              && (status.parentRef.namespace ?? route.getNs()) === (ref.namespace ?? route.getNs())
              && status.parentRef.sectionName === ref.sectionName
            ));

            return parentStatus
              ? <ConditionBadges conditions={parentStatus.conditions} />
              : <StatusBadge tone="warning" label="No status" />;
          },
        },
      ]}
    />
    <ResourceTable
      title="Rules"
      rows={route.spec.rules as RouteRule[] | undefined}
      columns={[
        { title: "#", className: "narrow", value: (rule, index) => rule.name ?? index + 1 },
        ...(renderMatch
          ? [{
            title: "Matches",
            value: (rule: RouteRule) => rule.matches?.map(renderMatch).join(" | ") || "*",
          }]
          : []),
        { title: "Filters", value: rule => rule.filters?.map(filter => filter.type).join(", ") },
        {
          title: "Backends",
          value: rule => rule.backendRefs?.map((ref, index) => (
            <div key={index}>
              <BackendRefLink reference={ref} parent={route} />
            </div>
          )),
        },
      ]}
    />
  </>
);
