/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import type { ClusterScopedMetadata, LabelSelector } from "@k8slens/kube-object";
import { KubeObject } from "@k8slens/kube-object";
import { describeResource } from "../../resource-views/common/resource-descriptor";
import type { KubeCondition } from "../../resource-views/common/kube-condition";

export const admissionRegistrationGroup = "admissionregistration.k8s.io";

export const validatingAdmissionPoliciesDescriptor = describeResource({
  id: "admission-policies-validating-policies",
  kind: "ValidatingAdmissionPolicy",
  group: admissionRegistrationGroup,
  versions: ["v1", "v1beta1"],
  apiName: "validatingadmissionpolicies",
  namespaced: false,
  title: "Validating Policies",
});

export const validatingAdmissionPolicyBindingsDescriptor = describeResource({
  id: "admission-policies-validating-bindings",
  kind: "ValidatingAdmissionPolicyBinding",
  group: admissionRegistrationGroup,
  versions: ["v1", "v1beta1"],
  apiName: "validatingadmissionpolicybindings",
  namespaced: false,
  title: "Validating Bindings",
});

export const mutatingAdmissionPoliciesDescriptor = describeResource({
  id: "admission-policies-mutating-policies",
  kind: "MutatingAdmissionPolicy",
  group: admissionRegistrationGroup,
  versions: ["v1", "v1beta1", "v1alpha1"],
  apiName: "mutatingadmissionpolicies",
  namespaced: false,
  title: "Mutating Policies",
});

export const mutatingAdmissionPolicyBindingsDescriptor = describeResource({
  id: "admission-policies-mutating-bindings",
  kind: "MutatingAdmissionPolicyBinding",
  group: admissionRegistrationGroup,
  versions: ["v1", "v1beta1", "v1alpha1"],
  apiName: "mutatingadmissionpolicybindings",
  namespaced: false,
  title: "Mutating Bindings",
});

export type FailurePolicy = "Fail" | "Ignore" | string;

export interface ParamKind {
  apiVersion?: string;
  kind?: string;
}

export interface NamedRuleWithOperations {
  operations?: string[];
  apiGroups?: string[];
  apiVersions?: string[];
  resources?: string[];
  resourceNames?: string[];
  scope?: "*" | "Cluster" | "Namespaced" | string;
}

export interface MatchResources {
  namespaceSelector?: LabelSelector;
  objectSelector?: LabelSelector;
  resourceRules?: NamedRuleWithOperations[];
  excludeResourceRules?: NamedRuleWithOperations[];
  matchPolicy?: "Exact" | "Equivalent" | string;
}

export interface MatchCondition {
  name: string;
  expression: string;
}

export interface Variable {
  name: string;
  expression: string;
}

export interface Validation {
  expression: string;
  message?: string;
  messageExpression?: string;
  reason?: string;
}

export interface AuditAnnotation {
  key: string;
  valueExpression: string;
}

export interface ValidatingAdmissionPolicySpec {
  paramKind?: ParamKind;
  matchConstraints?: MatchResources;
  validations?: Validation[];
  failurePolicy?: FailurePolicy;
  auditAnnotations?: AuditAnnotation[];
  matchConditions?: MatchCondition[];
  variables?: Variable[];
}

export interface ExpressionWarning {
  fieldRef: string;
  warning: string;
}

export interface ValidatingAdmissionPolicyStatus {
  observedGeneration?: number;
  typeChecking?: {
    expressionWarnings?: ExpressionWarning[];
  };
  conditions?: KubeCondition[];
}

export class ValidatingAdmissionPolicy extends KubeObject<ClusterScopedMetadata, ValidatingAdmissionPolicyStatus, ValidatingAdmissionPolicySpec> {
  static readonly kind = validatingAdmissionPoliciesDescriptor.kind;
  static readonly namespaced = validatingAdmissionPoliciesDescriptor.namespaced;
  static readonly apiBase = validatingAdmissionPoliciesDescriptor.apiBase;
}

export interface ParamRef {
  name?: string;
  namespace?: string;
  selector?: LabelSelector;
  parameterNotFoundAction?: "Allow" | "Deny" | string;
}

export type ValidationAction = "Deny" | "Warn" | "Audit" | string;

export interface ValidatingAdmissionPolicyBindingSpec {
  policyName: string;
  paramRef?: ParamRef;
  matchResources?: MatchResources;
  validationActions?: ValidationAction[];
}

export class ValidatingAdmissionPolicyBinding extends KubeObject<ClusterScopedMetadata, void, ValidatingAdmissionPolicyBindingSpec> {
  static readonly kind = validatingAdmissionPolicyBindingsDescriptor.kind;
  static readonly namespaced = validatingAdmissionPolicyBindingsDescriptor.namespaced;
  static readonly apiBase = validatingAdmissionPolicyBindingsDescriptor.apiBase;
}

export interface Mutation {
  patchType: "ApplyConfiguration" | "JSONPatch" | string;
  applyConfiguration?: {
    expression: string;
  };
  jsonPatch?: {
    expression: string;
  };
}

export interface MutatingAdmissionPolicySpec {
  paramKind?: ParamKind;
  matchConstraints?: MatchResources;
  variables?: Variable[];
  mutations?: Mutation[];
  failurePolicy?: FailurePolicy;
  matchConditions?: MatchCondition[];
  reinvocationPolicy?: "Never" | "IfNeeded" | string;
}

/**
 * Mutating admission policies have no status
 */
export class MutatingAdmissionPolicy extends KubeObject<ClusterScopedMetadata, void, MutatingAdmissionPolicySpec> {
  static readonly kind = mutatingAdmissionPoliciesDescriptor.kind;
  static readonly namespaced = mutatingAdmissionPoliciesDescriptor.namespaced;
  static readonly apiBase = mutatingAdmissionPoliciesDescriptor.apiBase;
}

export interface MutatingAdmissionPolicyBindingSpec {
  policyName: string;
  paramRef?: ParamRef;
  matchResources?: MatchResources;
}

export class MutatingAdmissionPolicyBinding extends KubeObject<ClusterScopedMetadata, void, MutatingAdmissionPolicyBindingSpec> {
  static readonly kind = mutatingAdmissionPolicyBindingsDescriptor.kind;
  static readonly namespaced = mutatingAdmissionPolicyBindingsDescriptor.namespaced;
  static readonly apiBase = mutatingAdmissionPolicyBindingsDescriptor.apiBase;
}

/**
 * E.g. "apps/deployments" or "pods" for the core group
 */
export const getMatchedResources = (rules: NamedRuleWithOperations[] | undefined) => [
  ...new Set(rules?.flatMap(rule => (
    (rule.apiGroups?.length ? rule.apiGroups : [""]).flatMap(group => (
      (rule.resources ?? []).map(resource => (group ? `${group}/${resource}` : resource))
    ))
  )) ?? []),
];

export const formatLabelSelector = (selector: LabelSelector | undefined) => {
  if (!selector) {
    return undefined;
  }

  const requirements = [
    ...Object.entries(selector.matchLabels ?? {}).map(([key, value]) => `${key}=${value ?? ""}`),
    ...(selector.matchExpressions ?? []).map(expression => {
      switch (expression.operator) {
        case "Exists":
          return expression.key;
        case "DoesNotExist":
          return `!${expression.key}`;
        case "In":
          return `${expression.key} in (${expression.values.join(", ")})`;
        case "NotIn":
          return `${expression.key} notin (${expression.values.join(", ")})`;
      }
    }),
  ];

  return requirements.length
    ? requirements.join(", ")
    : "Everything";
};

export const formatParamRef = (paramRef: ParamRef | undefined) => {
  if (!paramRef) {
    return undefined;
  }

  if (paramRef.name) {
    return paramRef.namespace
      ? `${paramRef.namespace}/${paramRef.name}`
      : paramRef.name;
  }

  const selector = `selector: ${formatLabelSelector(paramRef.selector) ?? "Everything"}`;

  return paramRef.namespace
    ? `${paramRef.namespace}/${selector}`
    : selector;
};

export const formatParamKind = (paramKind: ParamKind | undefined) => (
  paramKind?.kind && [paramKind.kind, paramKind.apiVersion && `(${paramKind.apiVersion})`].filter(Boolean).join(" ")
);
