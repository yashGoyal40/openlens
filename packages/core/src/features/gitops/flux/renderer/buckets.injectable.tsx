/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import React from "react";
import { FluxBucket, fluxBucketsDescriptor } from "../common/flux-resources";
import { fluxBucketsRoutes } from "../common/flux-routes.injectable";
import { createResourceViewInjectables } from "../../../resource-views/renderer/create-resource-view-injectables";
import { defineResourceView } from "../../../resource-views/renderer/resource-view-definition";
import { ObjectReferenceLink } from "../../../resource-views/renderer/components/object-reference-link";
import { FluxConditions, getFluxColumns, getFluxDetails, getSourceColumns, getSourceDetails } from "./flux-view-helpers";
import fluxSidebarGroupInjectable from "./flux-sidebar-group.injectable";

const getProvider = (bucket: FluxBucket) => bucket.spec.provider ?? "generic";

const formatBucket = (bucket: FluxBucket) => [
  bucket.spec.bucketName,
  bucket.spec.prefix,
].filter(Boolean).join("/");

export const {
  apiInjectable,
  storeInjectable,
  routeComponentInjectable,
  sidebarItemInjectable,
  detailItemInjectable,
  descriptorInjectable,
} = createResourceViewInjectables(defineResourceView<FluxBucket>({
  descriptor: fluxBucketsDescriptor,
  objectConstructor: FluxBucket,
  routes: fluxBucketsRoutes,
  sidebar: {
    parentId: fluxSidebarGroupInjectable.id,
    orderNumber: 70,
  },
  columns: [
    {
      id: "endpoint",
      title: "Endpoint",
      size: "wide",
      value: bucket => bucket.spec.endpoint,
      sortBy: bucket => bucket.spec.endpoint,
      search: bucket => bucket.spec.endpoint,
    },
    {
      id: "bucket",
      title: "Bucket",
      value: formatBucket,
      sortBy: formatBucket,
      search: formatBucket,
    },
    {
      id: "provider",
      title: "Provider",
      size: "narrow",
      value: getProvider,
      sortBy: getProvider,
    },
    ...getSourceColumns<FluxBucket>(),
    ...getFluxColumns<FluxBucket>(),
  ],
  details: [
    ...getFluxDetails<FluxBucket>(),
    {
      name: "Endpoint",
      value: bucket => bucket.spec.endpoint,
    },
    {
      name: "Bucket",
      value: bucket => bucket.spec.bucketName,
    },
    {
      name: "Prefix",
      value: bucket => bucket.spec.prefix,
      hidden: bucket => !bucket.spec.prefix,
    },
    {
      name: "Provider",
      value: getProvider,
    },
    {
      name: "Region",
      value: bucket => bucket.spec.region,
      hidden: bucket => !bucket.spec.region,
    },
    {
      name: "Secret",
      value: bucket => bucket.spec.secretRef && (
        <ObjectReferenceLink parent={bucket} reference={{ kind: "Secret", group: "", name: bucket.spec.secretRef.name }} />
      ),
      hidden: bucket => !bucket.spec.secretRef,
    },
    {
      name: "Insecure",
      value: bucket => bucket.spec.insecure ? "Yes" : "No",
      hidden: bucket => !bucket.spec.insecure,
    },
    ...getSourceDetails<FluxBucket>(),
  ],
  DetailsComponent: FluxConditions,

  // Rendered by FluxConditions, with the polarity of the Flux condition types
  getConditions: () => undefined,
}));
