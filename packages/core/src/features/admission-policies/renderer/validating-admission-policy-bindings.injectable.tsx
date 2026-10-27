/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import React from "react";
import {
  ValidatingAdmissionPolicyBinding,
  validatingAdmissionPolicyBindingsDescriptor,
  validatingAdmissionPoliciesDescriptor,
} from "../common/admission-policies-resources";
import { validatingAdmissionPolicyBindingsRoutes } from "../common/admission-policies-routes.injectable";
import { createResourceViewInjectables } from "../../resource-views/renderer/create-resource-view-injectables";
import { defineResourceView } from "../../resource-views/renderer/resource-view-definition";
import { getBindingColumns, getBindingDetails, MatchResourcesDetails, ValidationActionBadges } from "./admission-policy-view-helpers";
import admissionPoliciesSidebarGroupInjectable from "./admission-policies-sidebar-group.injectable";

const policyKind = validatingAdmissionPoliciesDescriptor.kind;

const getValidationActions = (binding: ValidatingAdmissionPolicyBinding) => binding.spec.validationActions ?? [];

const { policy, paramRef, matches } = getBindingColumns<ValidatingAdmissionPolicyBinding>({ policyKind });

export const {
  apiInjectable,
  storeInjectable,
  routeComponentInjectable,
  sidebarItemInjectable,
  detailItemInjectable,
  descriptorInjectable,
} = createResourceViewInjectables(defineResourceView<ValidatingAdmissionPolicyBinding>({
  descriptor: validatingAdmissionPolicyBindingsDescriptor,
  objectConstructor: ValidatingAdmissionPolicyBinding,
  routes: validatingAdmissionPolicyBindingsRoutes,
  sidebar: {
    parentId: admissionPoliciesSidebarGroupInjectable.id,
    orderNumber: 20,
  },
  columns: [
    policy,
    {
      id: "validation-actions",
      title: "Actions",
      value: binding => <ValidationActionBadges actions={getValidationActions(binding)} />,
      sortBy: binding => getValidationActions(binding).join(","),
      search: getValidationActions,
    },
    paramRef,
    matches,
  ],
  details: [
    ...getBindingDetails<ValidatingAdmissionPolicyBinding>({ policyKind }),
    {
      name: "Validation Actions",
      value: binding => <ValidationActionBadges actions={getValidationActions(binding)} />,
    },
  ],
  DetailsComponent: ({ object: binding }) => (
    <MatchResourcesDetails title="Match Resources" match={binding.spec.matchResources} />
  ),
}));
