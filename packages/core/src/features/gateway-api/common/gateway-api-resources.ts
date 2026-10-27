/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import type { ClusterScopedMetadata, NamespaceScopedMetadata } from "@k8slens/kube-object";
import { KubeObject } from "@k8slens/kube-object";
import { describeResource } from "../../resource-views/common/resource-descriptor";
import type { KubeCondition } from "../../resource-views/common/kube-condition";

const group = "gateway.networking.k8s.io";

export const gatewayClassesDescriptor = describeResource({
  id: "gateway-api-gateway-classes",
  kind: "GatewayClass",
  group,
  versions: ["v1", "v1beta1"],
  apiName: "gatewayclasses",
  namespaced: false,
  title: "Gateway Classes",
});

export const gatewaysDescriptor = describeResource({
  id: "gateway-api-gateways",
  kind: "Gateway",
  group,
  versions: ["v1", "v1beta1"],
  apiName: "gateways",
  namespaced: true,
  title: "Gateways",
});

export const httpRoutesDescriptor = describeResource({
  id: "gateway-api-http-routes",
  kind: "HTTPRoute",
  group,
  versions: ["v1", "v1beta1"],
  apiName: "httproutes",
  namespaced: true,
  title: "HTTP Routes",
});

export const grpcRoutesDescriptor = describeResource({
  id: "gateway-api-grpc-routes",
  kind: "GRPCRoute",
  group,
  versions: ["v1", "v1alpha2"],
  apiName: "grpcroutes",
  namespaced: true,
  title: "GRPC Routes",
});

export const tlsRoutesDescriptor = describeResource({
  id: "gateway-api-tls-routes",
  kind: "TLSRoute",
  group,
  versions: ["v1alpha3", "v1alpha2"],
  apiName: "tlsroutes",
  namespaced: true,
  title: "TLS Routes",
});

export const tcpRoutesDescriptor = describeResource({
  id: "gateway-api-tcp-routes",
  kind: "TCPRoute",
  group,
  versions: ["v1alpha2"],
  apiName: "tcproutes",
  namespaced: true,
  title: "TCP Routes",
});

export const udpRoutesDescriptor = describeResource({
  id: "gateway-api-udp-routes",
  kind: "UDPRoute",
  group,
  versions: ["v1alpha2"],
  apiName: "udproutes",
  namespaced: true,
  title: "UDP Routes",
});

export const referenceGrantsDescriptor = describeResource({
  id: "gateway-api-reference-grants",
  kind: "ReferenceGrant",
  group,
  versions: ["v1beta1", "v1alpha2"],
  apiName: "referencegrants",
  namespaced: true,
  title: "Reference Grants",
});

export const backendTlsPoliciesDescriptor = describeResource({
  id: "gateway-api-backend-tls-policies",
  kind: "BackendTLSPolicy",
  group,
  versions: ["v1", "v1alpha3"],
  apiName: "backendtlspolicies",
  namespaced: true,
  title: "Backend TLS Policies",
});

export interface LocalObjectReference {
  group?: string;
  kind?: string;
  name: string;
}

export interface ObjectReferenceWithNamespace extends LocalObjectReference {
  namespace?: string;
}

export interface ParentReference extends ObjectReferenceWithNamespace {
  sectionName?: string;
  port?: number;
}

export interface BackendReference extends ObjectReferenceWithNamespace {
  port?: number;
  weight?: number;
}

export interface RouteParentStatus {
  parentRef: ParentReference;
  controllerName: string;
  conditions?: KubeCondition[];
}

export interface RouteStatus {
  parents?: RouteParentStatus[];
}

export interface GatewayClassSpec {
  controllerName: string;
  description?: string;
  parametersRef?: ObjectReferenceWithNamespace;
}

export interface GatewayClassStatus {
  conditions?: KubeCondition[];
}

export class GatewayClass extends KubeObject<ClusterScopedMetadata, GatewayClassStatus, GatewayClassSpec> {
  static readonly kind = gatewayClassesDescriptor.kind;
  static readonly namespaced = gatewayClassesDescriptor.namespaced;
  static readonly apiBase = gatewayClassesDescriptor.apiBase;
}

export interface GatewayListener {
  name: string;
  hostname?: string;
  port: number;
  protocol: string;
  tls?: {
    mode?: "Terminate" | "Passthrough" | string;
    certificateRefs?: ObjectReferenceWithNamespace[];
  };
  allowedRoutes?: {
    namespaces?: {
      from?: "All" | "Same" | "Selector" | string;
    };
    kinds?: LocalObjectReference[];
  };
}

export interface GatewayAddress {
  type?: string;
  value: string;
}

export interface GatewaySpec {
  gatewayClassName: string;
  listeners: GatewayListener[];
  addresses?: GatewayAddress[];
}

export interface GatewayListenerStatus {
  name: string;
  attachedRoutes: number;
  supportedKinds?: LocalObjectReference[];
  conditions?: KubeCondition[];
}

export interface GatewayStatus {
  addresses?: GatewayAddress[];
  conditions?: KubeCondition[];
  listeners?: GatewayListenerStatus[];
}

export class Gateway extends KubeObject<NamespaceScopedMetadata, GatewayStatus, GatewaySpec> {
  static readonly kind = gatewaysDescriptor.kind;
  static readonly namespaced = gatewaysDescriptor.namespaced;
  static readonly apiBase = gatewaysDescriptor.apiBase;
}

export interface RouteRule<Match = unknown> {
  name?: string;
  matches?: Match[];
  filters?: { type: string }[];
  backendRefs?: BackendReference[];
}

export interface CommonRouteSpec<Match = unknown> {
  parentRefs?: ParentReference[];
  hostnames?: string[];
  rules?: RouteRule<Match>[];
}

export interface HTTPRouteMatch {
  path?: { type?: string; value?: string };
  method?: string;
  headers?: { type?: string; name: string; value: string }[];
  queryParams?: { type?: string; name: string; value: string }[];
}

export class HTTPRoute extends KubeObject<NamespaceScopedMetadata, RouteStatus, CommonRouteSpec<HTTPRouteMatch>> {
  static readonly kind = httpRoutesDescriptor.kind;
  static readonly namespaced = httpRoutesDescriptor.namespaced;
  static readonly apiBase = httpRoutesDescriptor.apiBase;
}

export interface GRPCRouteMatch {
  method?: { type?: string; service?: string; method?: string };
  headers?: { type?: string; name: string; value: string }[];
}

export class GRPCRoute extends KubeObject<NamespaceScopedMetadata, RouteStatus, CommonRouteSpec<GRPCRouteMatch>> {
  static readonly kind = grpcRoutesDescriptor.kind;
  static readonly namespaced = grpcRoutesDescriptor.namespaced;
  static readonly apiBase = grpcRoutesDescriptor.apiBase;
}

export class TLSRoute extends KubeObject<NamespaceScopedMetadata, RouteStatus, CommonRouteSpec> {
  static readonly kind = tlsRoutesDescriptor.kind;
  static readonly namespaced = tlsRoutesDescriptor.namespaced;
  static readonly apiBase = tlsRoutesDescriptor.apiBase;
}

export class TCPRoute extends KubeObject<NamespaceScopedMetadata, RouteStatus, CommonRouteSpec> {
  static readonly kind = tcpRoutesDescriptor.kind;
  static readonly namespaced = tcpRoutesDescriptor.namespaced;
  static readonly apiBase = tcpRoutesDescriptor.apiBase;
}

export class UDPRoute extends KubeObject<NamespaceScopedMetadata, RouteStatus, CommonRouteSpec> {
  static readonly kind = udpRoutesDescriptor.kind;
  static readonly namespaced = udpRoutesDescriptor.namespaced;
  static readonly apiBase = udpRoutesDescriptor.apiBase;
}

export type AnyRoute = HTTPRoute | GRPCRoute | TLSRoute | TCPRoute | UDPRoute;

export interface ReferenceGrantSpec {
  from: { group: string; kind: string; namespace: string }[];
  to: { group: string; kind: string; name?: string }[];
}

export class ReferenceGrant extends KubeObject<NamespaceScopedMetadata, void, ReferenceGrantSpec> {
  static readonly kind = referenceGrantsDescriptor.kind;
  static readonly namespaced = referenceGrantsDescriptor.namespaced;
  static readonly apiBase = referenceGrantsDescriptor.apiBase;
}

export interface BackendTLSPolicySpec {
  targetRefs: (LocalObjectReference & { sectionName?: string })[];
  validation: {
    caCertificateRefs?: LocalObjectReference[];
    wellKnownCACertificates?: string;
    hostname: string;
    subjectAltNames?: { type: string; hostname?: string; uri?: string }[];
  };
}

export interface PolicyAncestorStatus {
  ancestorRef: ParentReference;
  controllerName: string;
  conditions?: KubeCondition[];
}

export interface BackendTLSPolicyStatus {
  ancestors?: PolicyAncestorStatus[];
}

export class BackendTLSPolicy extends KubeObject<NamespaceScopedMetadata, BackendTLSPolicyStatus, BackendTLSPolicySpec> {
  static readonly kind = backendTlsPoliciesDescriptor.kind;
  static readonly namespaced = backendTlsPoliciesDescriptor.namespaced;
  static readonly apiBase = backendTlsPoliciesDescriptor.apiBase;
}
