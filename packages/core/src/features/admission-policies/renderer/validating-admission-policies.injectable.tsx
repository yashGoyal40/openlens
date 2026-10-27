/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import React from "react";
import { ValidatingAdmissionPolicy, validatingAdmissionPoliciesDescriptor } from "../common/admission-policies-resources";
import { validatingAdmissionPoliciesRoutes } from "../common/admission-policies-routes.injectable";
import { createResourceViewInjectables } from "../../resource-views/renderer/create-resource-view-injectables";
import { defineResourceView } from "../../resource-views/renderer/resource-view-definition";
import { StatusBadge } from "../../resource-views/renderer/components/status-badge";
import { ResourceTable } from "../../resource-views/renderer/components/resource-table";
import { Code, getPolicyColumns, getPolicyDetails, MatchConditionsTable, MatchResourcesDetails, VariablesTable } from "./admission-policy-view-helpers";
import admissionPoliciesSidebarGroupInjectable from "./admission-policies-sidebar-group.injectable";

const getValidationCount = (policy: ValidatingAdmissionPolicy) => policy.spec.validations?.length ?? 0;

const getExpressionWarnings = (policy: ValidatingAdmissionPolicy) => policy.status?.typeChecking?.expressionWarnings ?? [];

const ExpressionWarningsBadge = ({ policy }: { policy: ValidatingAdmissionPolicy }) => {
  const warnings = getExpressionWarnings(policy);

  if (warnings.length === 0) {
    return <>0</>;
  }

  return (
    <StatusBadge
      tone="warning"
      label={warnings.length}
      tooltip={warnings.map(warning => `${warning.fieldRef}: ${warning.warning}`).join("\n")}
    />
  );
};

const ValidatingAdmissionPolicyDetails = ({ object: policy }: { object: ValidatingAdmissionPolicy }) => (
  <>
    <ResourceTable
      title="Type Checking Warnings"
      rows={getExpressionWarnings(policy)}
      columns={[
        { title: "Field", value: warning => warning.fieldRef },
        { title: "Warning", className: "wide", value: warning => <Code>{warning.warning}</Code> },
      ]}
    />
    <ResourceTable
      title="Validations"
      rows={policy.spec.validations}
      columns={[
        { title: "#", className: "narrow", value: (validation, index) => index + 1 },
        { title: "Expression", className: "wide", value: validation => <Code>{validation.expression}</Code> },
        {
          title: "Message",
          value: validation => (
            <>
              {validation.message}
              {validation.messageExpression && <Code>{validation.messageExpression}</Code>}
            </>
          ),
        },
        { title: "Reason", value: validation => validation.reason ?? "Invalid" },
      ]}
    />
    <ResourceTable
      title="Audit Annotations"
      rows={policy.spec.auditAnnotations}
      columns={[
        { title: "Key", value: annotation => annotation.key },
        { title: "Value Expression", className: "wide", value: annotation => <Code>{annotation.valueExpression}</Code> },
      ]}
    />
    <MatchConditionsTable conditions={policy.spec.matchConditions} />
    <VariablesTable variables={policy.spec.variables} />
    <MatchResourcesDetails title="Match Constraints" match={policy.spec.matchConstraints} />
  </>
);

const { failurePolicy, matches, paramKind } = getPolicyColumns<ValidatingAdmissionPolicy>();

export const {
  apiInjectable,
  storeInjectable,
  routeComponentInjectable,
  sidebarItemInjectable,
  detailItemInjectable,
  descriptorInjectable,
} = createResourceViewInjectables(defineResourceView<ValidatingAdmissionPolicy>({
  descriptor: validatingAdmissionPoliciesDescriptor,
  objectConstructor: ValidatingAdmissionPolicy,
  routes: validatingAdmissionPoliciesRoutes,
  sidebar: {
    parentId: admissionPoliciesSidebarGroupInjectable.id,
    orderNumber: 10,
  },
  columns: [
    failurePolicy,
    {
      id: "validations",
      title: "Validations",
      size: "narrow",
      value: getValidationCount,
      sortBy: getValidationCount,
    },
    matches,
    paramKind,
    {
      id: "warnings",
      title: "Warnings",
      size: "narrow",
      value: policy => <ExpressionWarningsBadge policy={policy} />,
      sortBy: policy => getExpressionWarnings(policy).length,
    },
  ],
  details: getPolicyDetails<ValidatingAdmissionPolicy>(),
  DetailsComponent: ValidatingAdmissionPolicyDetails,
}));
