/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { createResourceRouteInjectables } from "../../../resource-views/common/create-resource-route-injectables";
import {
  argoApplicationSetsDescriptor,
  argoApplicationsDescriptor,
  argoAppProjectsDescriptor,
} from "./argo-cd-resources";

export const argoApplicationsRoutes = createResourceRouteInjectables(argoApplicationsDescriptor);
export const argoApplicationsRouteInjectable = argoApplicationsRoutes.routeInjectable;
export const navigateToArgoApplicationsInjectable = argoApplicationsRoutes.navigateInjectable;

export const argoApplicationSetsRoutes = createResourceRouteInjectables(argoApplicationSetsDescriptor);
export const argoApplicationSetsRouteInjectable = argoApplicationSetsRoutes.routeInjectable;
export const navigateToArgoApplicationSetsInjectable = argoApplicationSetsRoutes.navigateInjectable;

export const argoAppProjectsRoutes = createResourceRouteInjectables(argoAppProjectsDescriptor);
export const argoAppProjectsRouteInjectable = argoAppProjectsRoutes.routeInjectable;
export const navigateToArgoAppProjectsInjectable = argoAppProjectsRoutes.navigateInjectable;
