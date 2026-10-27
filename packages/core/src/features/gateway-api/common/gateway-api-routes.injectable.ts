/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { createResourceRouteInjectables } from "../../resource-views/common/create-resource-route-injectables";
import {
  backendTlsPoliciesDescriptor,
  gatewayClassesDescriptor,
  gatewaysDescriptor,
  grpcRoutesDescriptor,
  httpRoutesDescriptor,
  referenceGrantsDescriptor,
  tcpRoutesDescriptor,
  tlsRoutesDescriptor,
  udpRoutesDescriptor,
} from "./gateway-api-resources";

export const gatewayClassesRoutes = createResourceRouteInjectables(gatewayClassesDescriptor);
export const gatewayClassesRouteInjectable = gatewayClassesRoutes.routeInjectable;
export const navigateToGatewayClassesInjectable = gatewayClassesRoutes.navigateInjectable;

export const gatewaysRoutes = createResourceRouteInjectables(gatewaysDescriptor);
export const gatewaysRouteInjectable = gatewaysRoutes.routeInjectable;
export const navigateToGatewaysInjectable = gatewaysRoutes.navigateInjectable;

export const httpRoutesRoutes = createResourceRouteInjectables(httpRoutesDescriptor);
export const httpRoutesRouteInjectable = httpRoutesRoutes.routeInjectable;
export const navigateToHttpRoutesInjectable = httpRoutesRoutes.navigateInjectable;

export const grpcRoutesRoutes = createResourceRouteInjectables(grpcRoutesDescriptor);
export const grpcRoutesRouteInjectable = grpcRoutesRoutes.routeInjectable;
export const navigateToGrpcRoutesInjectable = grpcRoutesRoutes.navigateInjectable;

export const tlsRoutesRoutes = createResourceRouteInjectables(tlsRoutesDescriptor);
export const tlsRoutesRouteInjectable = tlsRoutesRoutes.routeInjectable;
export const navigateToTlsRoutesInjectable = tlsRoutesRoutes.navigateInjectable;

export const tcpRoutesRoutes = createResourceRouteInjectables(tcpRoutesDescriptor);
export const tcpRoutesRouteInjectable = tcpRoutesRoutes.routeInjectable;
export const navigateToTcpRoutesInjectable = tcpRoutesRoutes.navigateInjectable;

export const udpRoutesRoutes = createResourceRouteInjectables(udpRoutesDescriptor);
export const udpRoutesRouteInjectable = udpRoutesRoutes.routeInjectable;
export const navigateToUdpRoutesInjectable = udpRoutesRoutes.navigateInjectable;

export const referenceGrantsRoutes = createResourceRouteInjectables(referenceGrantsDescriptor);
export const referenceGrantsRouteInjectable = referenceGrantsRoutes.routeInjectable;
export const navigateToReferenceGrantsInjectable = referenceGrantsRoutes.navigateInjectable;

export const backendTlsPoliciesRoutes = createResourceRouteInjectables(backendTlsPoliciesDescriptor);
export const backendTlsPoliciesRouteInjectable = backendTlsPoliciesRoutes.routeInjectable;
export const navigateToBackendTlsPoliciesInjectable = backendTlsPoliciesRoutes.navigateInjectable;
