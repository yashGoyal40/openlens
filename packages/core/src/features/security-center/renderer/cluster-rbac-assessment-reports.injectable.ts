/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { ClusterRbacAssessmentReport, clusterRbacAssessmentReportsDescriptor } from "../common/security-center-resources";
import { clusterRbacAssessmentReportsRoutes } from "../common/security-center-routes.injectable";
import { createResourceViewInjectables } from "../../resource-views/renderer/create-resource-view-injectables";
import { defineResourceView } from "../../resource-views/renderer/resource-view-definition";
import { AuditChecksTable, getAuditColumns, getAuditDetails } from "./components/audit-report-view";
import securityCenterSidebarGroupInjectable from "./security-center-sidebar-group.injectable";

export const {
  apiInjectable,
  storeInjectable,
  routeComponentInjectable,
  sidebarItemInjectable,
  detailItemInjectable,
  descriptorInjectable,
} = createResourceViewInjectables(defineResourceView<ClusterRbacAssessmentReport>({
  descriptor: clusterRbacAssessmentReportsDescriptor,
  objectConstructor: ClusterRbacAssessmentReport,
  routes: clusterRbacAssessmentReportsRoutes,
  sidebar: {
    parentId: securityCenterSidebarGroupInjectable.id,
    orderNumber: 45,
  },
  columns: getAuditColumns<ClusterRbacAssessmentReport>(),
  details: getAuditDetails<ClusterRbacAssessmentReport>(),
  DetailsComponent: AuditChecksTable,
}));
