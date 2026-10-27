/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import styles from "./admission-policies.module.scss";

import React from "react";
import type {
  MatchCondition,
  MatchResources,
  MutatingAdmissionPolicy,
  MutatingAdmissionPolicyBinding,
  NamedRuleWithOperations,
  ValidatingAdmissionPolicy,
  ValidatingAdmissionPolicyBinding,
  ValidationAction,
  Variable,
} from "../common/admission-policies-resources";
import {
  admissionRegistrationGroup,
  formatLabelSelector,
  formatParamKind,
  formatParamRef,
  getMatchedResources,
} from "../common/admission-policies-resources";
import type { ResourceColumn, ResourceDetail } from "../../resource-views/renderer/resource-view-definition";
import type { StatusTone } from "../../resource-views/renderer/components/status-badge";
import { StatusBadge } from "../../resource-views/renderer/components/status-badge";
import { ObjectReferenceLink } from "../../resource-views/renderer/components/object-reference-link";
import { ResourceTable } from "../../resource-views/renderer/components/resource-table";
import { DrawerItem, DrawerTitle } from "../../../renderer/components/drawer";

export type AnyAdmissionPolicy = ValidatingAdmissionPolicy | MutatingAdmissionPolicy;
export type AnyAdmissionPolicyBinding = ValidatingAdmissionPolicyBinding | MutatingAdmissionPolicyBinding;

export const Code = ({ children }: { children: string }) => (
  <code className={styles.code}>{children}</code>
);

const formatList = (values: string[] | undefined) => values?.join(", ");

const getFailurePolicy = (policy: AnyAdmissionPolicy) => policy.spec.failurePolicy ?? "Fail";

const getPolicyMatchedResources = (policy: AnyAdmissionPolicy) => getMatchedResources(policy.spec.matchConstraints?.resourceRules);

const getBindingMatchedResources = (binding: AnyAdmissionPolicyBinding) => getMatchedResources(binding.spec.matchResources?.resourceRules);

export const getPolicyColumns = <Policy extends AnyAdmissionPolicy>() => {
  const failurePolicy: ResourceColumn<Policy> = {
    id: "failure-policy",
    title: "Failure Policy",
    size: "narrow",
    value: getFailurePolicy,
    sortBy: getFailurePolicy,
  };

  const matches: ResourceColumn<Policy> = {
    id: "matches",
    title: "Matches",
    size: "wide",
    value: policy => getPolicyMatchedResources(policy).join(", "),
    search: getPolicyMatchedResources,
  };

  const paramKind: ResourceColumn<Policy> = {
    id: "param-kind",
    title: "Param Kind",
    value: policy => formatParamKind(policy.spec.paramKind),
    sortBy: policy => policy.spec.paramKind?.kind,
    search: policy => policy.spec.paramKind?.kind,
  };

  return { failurePolicy, matches, paramKind };
};

export const getPolicyDetails = <Policy extends AnyAdmissionPolicy>(): ResourceDetail<Policy>[] => [
  {
    name: "Failure Policy",
    value: getFailurePolicy,
  },
  {
    name: "Param Kind",
    value: policy => formatParamKind(policy.spec.paramKind),
    hidden: policy => !policy.spec.paramKind,
  },
];

const RuleTable = ({ title, rules }: { title: string; rules: NamedRuleWithOperations[] | undefined }) => {
  const hasResourceNames = rules?.some(rule => rule.resourceNames?.length);

  return (
    <ResourceTable
      title={title}
      rows={rules}
      columns={[
        { title: "Operations", value: rule => formatList(rule.operations) },
        { title: "API Groups", value: rule => rule.apiGroups?.map(group => group || "core").join(", ") },
        { title: "API Versions", value: rule => formatList(rule.apiVersions) },
        { title: "Resources", value: rule => formatList(rule.resources) },
        { title: "Scope", className: "narrow", value: rule => rule.scope ?? "*" },
        ...(hasResourceNames
          ? [{ title: "Names", value: (rule: NamedRuleWithOperations) => formatList(rule.resourceNames) }]
          : []),
      ]}
    />
  );
};

export interface MatchResourcesDetailsProps {
  title: string;
  match: MatchResources | undefined;
}

/**
 * Shows the `matchConstraints` of a policy or the `matchResources` of a binding
 */
export const MatchResourcesDetails = ({ title, match }: MatchResourcesDetailsProps) => {
  if (!match) {
    return null;
  }

  return (
    <>
      <DrawerTitle>{title}</DrawerTitle>
      <DrawerItem name="Match Policy">
        {match.matchPolicy ?? "Equivalent"}
      </DrawerItem>
      <DrawerItem name="Namespace Selector" hidden={!match.namespaceSelector}>
        {formatLabelSelector(match.namespaceSelector)}
      </DrawerItem>
      <DrawerItem name="Object Selector" hidden={!match.objectSelector}>
        {formatLabelSelector(match.objectSelector)}
      </DrawerItem>
      <RuleTable title="Resource Rules" rules={match.resourceRules} />
      <RuleTable title="Excluded Resource Rules" rules={match.excludeResourceRules} />
    </>
  );
};

export const MatchConditionsTable = ({ conditions }: { conditions: MatchCondition[] | undefined }) => (
  <ResourceTable
    title="Match Conditions"
    rows={conditions}
    columns={[
      { title: "Name", value: condition => condition.name },
      { title: "Expression", className: "wide", value: condition => <Code>{condition.expression}</Code> },
    ]}
  />
);

export const VariablesTable = ({ variables }: { variables: Variable[] | undefined }) => (
  <ResourceTable
    title="Variables"
    rows={variables}
    columns={[
      { title: "Name", value: variable => variable.name },
      { title: "Expression", className: "wide", value: variable => <Code>{variable.expression}</Code> },
    ]}
  />
);

const PolicyLink = ({ binding, kind }: { binding: AnyAdmissionPolicyBinding; kind: string }) => (
  <ObjectReferenceLink
    parent={binding}
    reference={{ kind, group: admissionRegistrationGroup, name: binding.spec.policyName }}
  />
);

export const getBindingColumns = <Binding extends AnyAdmissionPolicyBinding>({ policyKind }: { policyKind: string }) => {
  const policy: ResourceColumn<Binding> = {
    id: "policy",
    title: "Policy",
    size: "wide",
    value: binding => <PolicyLink binding={binding} kind={policyKind} />,
    sortBy: binding => binding.spec.policyName,
    search: binding => binding.spec.policyName,
  };

  const paramRef: ResourceColumn<Binding> = {
    id: "param-ref",
    title: "Param",
    value: binding => formatParamRef(binding.spec.paramRef),
    search: binding => binding.spec.paramRef?.name,
  };

  const matches: ResourceColumn<Binding> = {
    id: "matches",
    title: "Matches",
    size: "wide",
    value: binding => getBindingMatchedResources(binding).join(", "),
    search: getBindingMatchedResources,
  };

  return { policy, paramRef, matches };
};

export const getBindingDetails = <Binding extends AnyAdmissionPolicyBinding>({ policyKind }: { policyKind: string }): ResourceDetail<Binding>[] => [
  {
    name: "Policy",
    value: binding => <PolicyLink binding={binding} kind={policyKind} />,
  },
  {
    name: "Param",
    value: binding => formatParamRef(binding.spec.paramRef),
    hidden: binding => !binding.spec.paramRef,
  },
  {
    name: "Param Not Found Action",
    value: binding => binding.spec.paramRef?.parameterNotFoundAction,
    hidden: binding => !binding.spec.paramRef?.parameterNotFoundAction,
  },
];

const validationActionTones: Partial<Record<ValidationAction, StatusTone>> = {
  Deny: "error",
  Warn: "warning",
  Audit: "info",
};

export const ValidationActionBadges = ({ actions }: { actions: ValidationAction[] | undefined }) => (
  <div className={styles.badges}>
    {actions?.map(action => (
      <StatusBadge
        key={action}
        tone={validationActionTones[action] ?? "vague"}
        label={action}
      />
    ))}
  </div>
);
