/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import React from "react";
import type { Mutation } from "../common/admission-policies-resources";
import { MutatingAdmissionPolicy, mutatingAdmissionPoliciesDescriptor } from "../common/admission-policies-resources";
import { mutatingAdmissionPoliciesRoutes } from "../common/admission-policies-routes.injectable";
import { createResourceViewInjectables } from "../../resource-views/renderer/create-resource-view-injectables";
import { defineResourceView } from "../../resource-views/renderer/resource-view-definition";
import { ResourceTable } from "../../resource-views/renderer/components/resource-table";
import { Code, getPolicyColumns, getPolicyDetails, MatchConditionsTable, MatchResourcesDetails, VariablesTable } from "./admission-policy-view-helpers";
import admissionPoliciesSidebarGroupInjectable from "./admission-policies-sidebar-group.injectable";

const getMutationCount = (policy: MutatingAdmissionPolicy) => policy.spec.mutations?.length ?? 0;

const getReinvocationPolicy = (policy: MutatingAdmissionPolicy) => policy.spec.reinvocationPolicy ?? "Never";

const getMutationExpression = (mutation: Mutation) => (
  mutation.applyConfiguration?.expression ?? mutation.jsonPatch?.expression ?? ""
);

const getPatchTypes = (policy: MutatingAdmissionPolicy) => [
  ...new Set(policy.spec.mutations?.map(mutation => mutation.patchType) ?? []),
];

const MutatingAdmissionPolicyDetails = ({ object: policy }: { object: MutatingAdmissionPolicy }) => (
  <>
    <ResourceTable
      title="Mutations"
      rows={policy.spec.mutations}
      columns={[
        { title: "#", className: "narrow", value: (mutation, index) => index + 1 },
        { title: "Patch Type", value: mutation => mutation.patchType },
        { title: "Expression", className: "wide", value: mutation => <Code>{getMutationExpression(mutation)}</Code> },
      ]}
    />
    <MatchConditionsTable conditions={policy.spec.matchConditions} />
    <VariablesTable variables={policy.spec.variables} />
    <MatchResourcesDetails title="Match Constraints" match={policy.spec.matchConstraints} />
  </>
);

const { failurePolicy, matches, paramKind } = getPolicyColumns<MutatingAdmissionPolicy>();

export const {
  apiInjectable,
  storeInjectable,
  routeComponentInjectable,
  sidebarItemInjectable,
  detailItemInjectable,
  descriptorInjectable,
} = createResourceViewInjectables(defineResourceView<MutatingAdmissionPolicy>({
  descriptor: mutatingAdmissionPoliciesDescriptor,
  objectConstructor: MutatingAdmissionPolicy,
  routes: mutatingAdmissionPoliciesRoutes,
  sidebar: {
    parentId: admissionPoliciesSidebarGroupInjectable.id,
    orderNumber: 30,
  },
  columns: [
    failurePolicy,
    {
      id: "mutations",
      title: "Mutations",
      size: "narrow",
      value: getMutationCount,
      sortBy: getMutationCount,
    },
    {
      id: "patch-types",
      title: "Patch Types",
      value: policy => getPatchTypes(policy).join(", "),
      search: getPatchTypes,
    },
    matches,
    paramKind,
    {
      id: "reinvocation",
      title: "Reinvocation",
      size: "narrow",
      value: getReinvocationPolicy,
      sortBy: getReinvocationPolicy,
    },
  ],
  details: [
    ...getPolicyDetails<MutatingAdmissionPolicy>(),
    {
      name: "Reinvocation Policy",
      value: getReinvocationPolicy,
    },
  ],
  DetailsComponent: MutatingAdmissionPolicyDetails,
}));
