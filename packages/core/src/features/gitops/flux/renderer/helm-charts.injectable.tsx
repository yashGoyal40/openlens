/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import React from "react";
import { FluxHelmChart, fluxHelmChartsDescriptor } from "../common/flux-resources";
import { fluxHelmChartsRoutes } from "../common/flux-routes.injectable";
import { createResourceViewInjectables } from "../../../resource-views/renderer/create-resource-view-injectables";
import { defineResourceView } from "../../../resource-views/renderer/resource-view-definition";
import {
  FluxConditions,
  FluxObjectReferenceLink,
  getFluxColumns,
  getFluxDetails,
  getSourceColumns,
  getSourceDetails,
} from "./flux-view-helpers";
import fluxSidebarGroupInjectable from "./flux-sidebar-group.injectable";

const formatChart = (chart: FluxHelmChart) => `${chart.spec.chart}@${chart.spec.version ?? "*"}`;

export const {
  apiInjectable,
  storeInjectable,
  routeComponentInjectable,
  sidebarItemInjectable,
  detailItemInjectable,
  descriptorInjectable,
} = createResourceViewInjectables(defineResourceView<FluxHelmChart>({
  descriptor: fluxHelmChartsDescriptor,
  objectConstructor: FluxHelmChart,
  routes: fluxHelmChartsRoutes,
  sidebar: {
    parentId: fluxSidebarGroupInjectable.id,
    orderNumber: 60,
  },
  columns: [
    {
      id: "chart",
      title: "Chart",
      value: formatChart,
      sortBy: formatChart,
      search: formatChart,
    },
    {
      id: "source",
      title: "Source",
      size: "wide",
      value: chart => <FluxObjectReferenceLink reference={chart.spec.sourceRef} parent={chart} />,
      sortBy: chart => chart.spec.sourceRef.name,
      search: chart => chart.spec.sourceRef.name,
    },
    ...getSourceColumns<FluxHelmChart>(),
    ...getFluxColumns<FluxHelmChart>(),
  ],
  details: [
    ...getFluxDetails<FluxHelmChart>(),
    {
      name: "Chart",
      value: chart => chart.spec.chart,
    },
    {
      name: "Version",
      value: chart => chart.spec.version ?? "*",
    },
    {
      name: "Source",
      value: chart => <FluxObjectReferenceLink reference={chart.spec.sourceRef} parent={chart} />,
    },
    {
      name: "Reconcile Strategy",
      value: chart => chart.spec.reconcileStrategy ?? "ChartVersion",
    },
    {
      name: "Values Files",
      value: chart => chart.spec.valuesFiles?.join(", "),
      hidden: chart => !chart.spec.valuesFiles?.length,
    },
    {
      name: "Source Revision",
      value: chart => chart.status?.observedSourceArtifactRevision,
      hidden: chart => !chart.status?.observedSourceArtifactRevision,
    },
    ...getSourceDetails<FluxHelmChart>(),
  ],
  DetailsComponent: FluxConditions,

  // Rendered by FluxConditions, with the polarity of the Flux condition types
  getConditions: () => undefined,
}));
