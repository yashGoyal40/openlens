/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { createResourceRouteInjectables } from "../../../resource-views/common/create-resource-route-injectables";
import {
  fluxBucketsDescriptor,
  fluxGitRepositoriesDescriptor,
  fluxHelmChartsDescriptor,
  fluxHelmReleasesDescriptor,
  fluxHelmRepositoriesDescriptor,
  fluxKustomizationsDescriptor,
  fluxOciRepositoriesDescriptor,
} from "./flux-resources";

export const fluxKustomizationsRoutes = createResourceRouteInjectables(fluxKustomizationsDescriptor);
export const fluxKustomizationsRouteInjectable = fluxKustomizationsRoutes.routeInjectable;
export const navigateToFluxKustomizationsInjectable = fluxKustomizationsRoutes.navigateInjectable;

export const fluxHelmReleasesRoutes = createResourceRouteInjectables(fluxHelmReleasesDescriptor);
export const fluxHelmReleasesRouteInjectable = fluxHelmReleasesRoutes.routeInjectable;
export const navigateToFluxHelmReleasesInjectable = fluxHelmReleasesRoutes.navigateInjectable;

export const fluxGitRepositoriesRoutes = createResourceRouteInjectables(fluxGitRepositoriesDescriptor);
export const fluxGitRepositoriesRouteInjectable = fluxGitRepositoriesRoutes.routeInjectable;
export const navigateToFluxGitRepositoriesInjectable = fluxGitRepositoriesRoutes.navigateInjectable;

export const fluxOciRepositoriesRoutes = createResourceRouteInjectables(fluxOciRepositoriesDescriptor);
export const fluxOciRepositoriesRouteInjectable = fluxOciRepositoriesRoutes.routeInjectable;
export const navigateToFluxOciRepositoriesInjectable = fluxOciRepositoriesRoutes.navigateInjectable;

export const fluxHelmRepositoriesRoutes = createResourceRouteInjectables(fluxHelmRepositoriesDescriptor);
export const fluxHelmRepositoriesRouteInjectable = fluxHelmRepositoriesRoutes.routeInjectable;
export const navigateToFluxHelmRepositoriesInjectable = fluxHelmRepositoriesRoutes.navigateInjectable;

export const fluxHelmChartsRoutes = createResourceRouteInjectables(fluxHelmChartsDescriptor);
export const fluxHelmChartsRouteInjectable = fluxHelmChartsRoutes.routeInjectable;
export const navigateToFluxHelmChartsInjectable = fluxHelmChartsRoutes.navigateInjectable;

export const fluxBucketsRoutes = createResourceRouteInjectables(fluxBucketsDescriptor);
export const fluxBucketsRouteInjectable = fluxBucketsRoutes.routeInjectable;
export const navigateToFluxBucketsInjectable = fluxBucketsRoutes.navigateInjectable;
