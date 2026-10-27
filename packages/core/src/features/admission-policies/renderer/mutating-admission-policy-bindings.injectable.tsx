/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import React from "react";
import {
  MutatingAdmissionPolicyBinding,
  mutatingAdmissionPolicyBindingsDescriptor,
  mutatingAdmissionPoliciesDescriptor,
} from "../common/admission-policies-resources";
import { mutatingAdmissionPolicyBindingsRoutes } from "../common/admission-policies-routes.injectable";
import { createResourceViewInjectables } from "../../resource-views/renderer/create-resource-view-injectables";
import { defineResourceView } from "../../resource-views/renderer/resource-view-definition";
import { getBindingColumns, getBindingDetails, MatchResourcesDetails } from "./admission-policy-view-helpers";
import admissionPoliciesSidebarGroupInjectable from "./admission-policies-sidebar-group.injectable";

const policyKind = mutatingAdmissionPoliciesDescriptor.kind;

const { policy, paramRef, matches } = getBindingColumns<MutatingAdmissionPolicyBinding>({ policyKind });

export const {
  apiInjectable,
  storeInjectable,
  routeComponentInjectable,
  sidebarItemInjectable,
  detailItemInjectable,
  descriptorInjectable,
} = createResourceViewInjectables(defineResourceView<MutatingAdmissionPolicyBinding>({
  descriptor: mutatingAdmissionPolicyBindingsDescriptor,
  objectConstructor: MutatingAdmissionPolicyBinding,
  routes: mutatingAdmissionPolicyBindingsRoutes,
  sidebar: {
    parentId: admissionPoliciesSidebarGroupInjectable.id,
    orderNumber: 40,
  },
  columns: [
    policy,
    paramRef,
    matches,
  ],
  details: getBindingDetails<MutatingAdmissionPolicyBinding>({ policyKind }),
  DetailsComponent: ({ object: binding }) => (
    <MatchResourcesDetails title="Match Resources" match={binding.spec.matchResources} />
  ),
}));
