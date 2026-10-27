/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { createResourceRouteInjectables } from "../../resource-views/common/create-resource-route-injectables";
import {
  clusterComplianceReportsDescriptor,
  clusterRbacAssessmentReportsDescriptor,
  configAuditReportsDescriptor,
  exposedSecretReportsDescriptor,
  infraAssessmentReportsDescriptor,
  rbacAssessmentReportsDescriptor,
  vulnerabilityReportsDescriptor,
} from "./security-center-resources";

/**
 * The overview summarises vulnerability reports, so it is available whenever those are
 */
export const securityOverviewRoutes = createResourceRouteInjectables({
  ...vulnerabilityReportsDescriptor,
  id: "security-center-overview",
  title: "Overview",
  path: "/security-center",
});
export const securityOverviewRouteInjectable = securityOverviewRoutes.routeInjectable;
export const navigateToSecurityOverviewInjectable = securityOverviewRoutes.navigateInjectable;

export const vulnerabilityReportsRoutes = createResourceRouteInjectables(vulnerabilityReportsDescriptor);
export const vulnerabilityReportsRouteInjectable = vulnerabilityReportsRoutes.routeInjectable;
export const navigateToVulnerabilityReportsInjectable = vulnerabilityReportsRoutes.navigateInjectable;

export const exposedSecretReportsRoutes = createResourceRouteInjectables(exposedSecretReportsDescriptor);
export const exposedSecretReportsRouteInjectable = exposedSecretReportsRoutes.routeInjectable;
export const navigateToExposedSecretReportsInjectable = exposedSecretReportsRoutes.navigateInjectable;

export const configAuditReportsRoutes = createResourceRouteInjectables(configAuditReportsDescriptor);
export const configAuditReportsRouteInjectable = configAuditReportsRoutes.routeInjectable;
export const navigateToConfigAuditReportsInjectable = configAuditReportsRoutes.navigateInjectable;

export const rbacAssessmentReportsRoutes = createResourceRouteInjectables(rbacAssessmentReportsDescriptor);
export const rbacAssessmentReportsRouteInjectable = rbacAssessmentReportsRoutes.routeInjectable;
export const navigateToRbacAssessmentReportsInjectable = rbacAssessmentReportsRoutes.navigateInjectable;

export const clusterRbacAssessmentReportsRoutes = createResourceRouteInjectables(clusterRbacAssessmentReportsDescriptor);
export const clusterRbacAssessmentReportsRouteInjectable = clusterRbacAssessmentReportsRoutes.routeInjectable;
export const navigateToClusterRbacAssessmentReportsInjectable = clusterRbacAssessmentReportsRoutes.navigateInjectable;

export const infraAssessmentReportsRoutes = createResourceRouteInjectables(infraAssessmentReportsDescriptor);
export const infraAssessmentReportsRouteInjectable = infraAssessmentReportsRoutes.routeInjectable;
export const navigateToInfraAssessmentReportsInjectable = infraAssessmentReportsRoutes.navigateInjectable;

export const clusterComplianceReportsRoutes = createResourceRouteInjectables(clusterComplianceReportsDescriptor);
export const clusterComplianceReportsRouteInjectable = clusterComplianceReportsRoutes.routeInjectable;
export const navigateToClusterComplianceReportsInjectable = clusterComplianceReportsRoutes.navigateInjectable;
