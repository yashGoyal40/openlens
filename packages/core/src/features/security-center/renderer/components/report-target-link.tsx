/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import React from "react";
import { Link } from "react-router-dom";
import { withInjectables } from "@ogre-tools/injectable-react";
import type { KubeObject } from "@k8slens/kube-object";
import type { StrictReactNode } from "@k8slens/utilities";
import type { GetDetailsUrl } from "../../../../renderer/components/kube-detail-params/get-details-url.injectable";
import getDetailsUrlInjectable from "../../../../renderer/components/kube-detail-params/get-details-url.injectable";
import { ObjectReferenceLink } from "../../../resource-views/renderer/components/object-reference-link";
import type { AnyTrivyReport, ReportTarget } from "../../common/security-center-resources";

/**
 * Report labels only carry the kind of the scanned resource, these are the kinds trivy-operator scans
 */
const groupsByKind: Partial<Record<string, string>> = {
  Pod: "",
  ReplicationController: "",
  Service: "",
  ConfigMap: "",
  Secret: "",
  ServiceAccount: "",
  Namespace: "",
  Node: "",
  ResourceQuota: "",
  LimitRange: "",
  PersistentVolume: "",
  PersistentVolumeClaim: "",
  Deployment: "apps",
  ReplicaSet: "apps",
  StatefulSet: "apps",
  DaemonSet: "apps",
  Job: "batch",
  CronJob: "batch",
  Role: "rbac.authorization.k8s.io",
  RoleBinding: "rbac.authorization.k8s.io",
  ClusterRole: "rbac.authorization.k8s.io",
  ClusterRoleBinding: "rbac.authorization.k8s.io",
  Ingress: "networking.k8s.io",
  IngressClass: "networking.k8s.io",
  NetworkPolicy: "networking.k8s.io",
  PodDisruptionBudget: "policy",
  PodSecurityPolicy: "policy",
  CustomResourceDefinition: "apiextensions.k8s.io",
  StorageClass: "storage.k8s.io",
  ValidatingWebhookConfiguration: "admissionregistration.k8s.io",
  MutatingWebhookConfiguration: "admissionregistration.k8s.io",
};

export const formatReportTarget = (target: ReportTarget | undefined) => (
  target
    ? `${target.kind} ${target.name}`
    : ""
);

export interface TargetLinkProps {
  target: ReportTarget | undefined;

  /**
   * The object holding the reference, used to default the namespace
   */
  parent: KubeObject;
}

export const TargetLink = ({ target, parent }: TargetLinkProps) => {
  if (!target) {
    return null;
  }

  return (
    <ObjectReferenceLink
      parent={parent}
      showKind
      reference={{
        kind: target.kind,
        group: groupsByKind[target.kind] ?? "",
        name: target.name,
        namespace: target.namespace,
      }}
    />
  );
};

export const ReportTargetLink = ({ report }: { report: AnyTrivyReport }) => (
  <TargetLink target={report.getTarget()} parent={report} />
);

interface Dependencies {
  getDetailsUrl: GetDetailsUrl;
}

export interface ReportDetailsLinkProps {
  report: KubeObject;

  /**
   * Defaults to the name of the report
   */
  children?: StrictReactNode;
}

const NonInjectedReportDetailsLink = ({ report, children, getDetailsUrl }: ReportDetailsLinkProps & Dependencies) => (
  <Link to={getDetailsUrl(report.selfLink)} onClick={event => event.stopPropagation()}>
    {children ?? report.getName()}
  </Link>
);

/**
 * Opens the details of a report itself
 */
export const ReportDetailsLink = withInjectables<Dependencies, ReportDetailsLinkProps>(NonInjectedReportDetailsLink, {
  getProps: (di, props) => ({
    ...props,
    getDetailsUrl: di.inject(getDetailsUrlInjectable),
  }),
});
