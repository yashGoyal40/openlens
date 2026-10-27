/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { RbacAssessmentReport, rbacAssessmentReportsDescriptor } from "../common/security-center-resources";
import { rbacAssessmentReportsRoutes } from "../common/security-center-routes.injectable";
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
} = createResourceViewInjectables(defineResourceView<RbacAssessmentReport>({
  descriptor: rbacAssessmentReportsDescriptor,
  objectConstructor: RbacAssessmentReport,
  routes: rbacAssessmentReportsRoutes,
  sidebar: {
    parentId: securityCenterSidebarGroupInjectable.id,
    orderNumber: 40,
  },
  columns: getAuditColumns<RbacAssessmentReport>(),
  details: getAuditDetails<RbacAssessmentReport>(),
  DetailsComponent: AuditChecksTable,
}));
