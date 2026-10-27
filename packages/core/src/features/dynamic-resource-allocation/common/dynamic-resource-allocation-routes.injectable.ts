/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { createResourceRouteInjectables } from "../../resource-views/common/create-resource-route-injectables";
import {
  deviceClassesDescriptor,
  resourceClaimsDescriptor,
  resourceClaimTemplatesDescriptor,
  resourceSlicesDescriptor,
} from "./dynamic-resource-allocation-resources";

export const resourceClaimsRoutes = createResourceRouteInjectables(resourceClaimsDescriptor);
export const resourceClaimsRouteInjectable = resourceClaimsRoutes.routeInjectable;
export const navigateToResourceClaimsInjectable = resourceClaimsRoutes.navigateInjectable;

export const resourceClaimTemplatesRoutes = createResourceRouteInjectables(resourceClaimTemplatesDescriptor);
export const resourceClaimTemplatesRouteInjectable = resourceClaimTemplatesRoutes.routeInjectable;
export const navigateToResourceClaimTemplatesInjectable = resourceClaimTemplatesRoutes.navigateInjectable;

export const deviceClassesRoutes = createResourceRouteInjectables(deviceClassesDescriptor);
export const deviceClassesRouteInjectable = deviceClassesRoutes.routeInjectable;
export const navigateToDeviceClassesInjectable = deviceClassesRoutes.navigateInjectable;

export const resourceSlicesRoutes = createResourceRouteInjectables(resourceSlicesDescriptor);
export const resourceSlicesRouteInjectable = resourceSlicesRoutes.routeInjectable;
export const navigateToResourceSlicesInjectable = resourceSlicesRoutes.navigateInjectable;
