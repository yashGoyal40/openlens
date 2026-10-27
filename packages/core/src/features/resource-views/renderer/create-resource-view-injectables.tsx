/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import React from "react";
import assert from "assert";
import { computed } from "mobx";
import { getInjectable } from "@ogre-tools/injectable";
import { withInjectables } from "@ogre-tools/injectable-react";
import type { KubeObject } from "@k8slens/kube-object";
import { KubeApi } from "@k8slens/kube-api";
import { kubeApiInjectionToken, maybeKubeApiInjectable, storesAndApisCanBeCreatedInjectionToken } from "@k8slens/kube-api-specifics";
import { loggerInjectionToken, logErrorInjectionToken, logInfoInjectionToken, logWarningInjectionToken } from "@k8slens/logger";
import { sidebarItemInjectionToken } from "@k8slens/cluster-sidebar";
import { KubeObjectStore } from "../../../common/k8s-api/kube-object.store";
import { kubeObjectStoreInjectionToken } from "../../../common/k8s-api/api-manager/kube-object-store-token";
import clusterFrameContextForNamespacedResourcesInjectable from "../../../renderer/cluster-frame-context/for-namespaced-resources.injectable";
import clusterFrameContextForClusterScopedResourcesInjectable from "../../../renderer/cluster-frame-context/for-cluster-scoped-resources.injectable";
import { routeSpecificComponentInjectionToken } from "../../../renderer/routes/route-specific-component-injection-token";
import routeIsActiveInjectable from "../../../renderer/routes/route-is-active.injectable";
import { kubeObjectDetailItemInjectionToken } from "../../../renderer/components/kube-object-details/kube-object-detail-items/kube-object-detail-item-injection-token";
import currentKubeObjectInDetailsInjectable from "../../../renderer/components/kube-object-details/current-kube-object-in-details.injectable";
import type { KubeObjectDetailsProps } from "../../../renderer/components/kube-object-details";
import { isObjectOfResource } from "../common/resource-descriptor";
import { resourceViewDescriptorInjectionToken } from "../common/resource-view-descriptor-injection-token";
import type { ResourceViewDefinition } from "./resource-view-definition";
import { ResourceList } from "./resource-list";
import { ResourceDetails } from "./resource-details";

/**
 * Creates everything a cluster resource needs to be browsable: the api, the store, the list
 * route component, the sidebar item and the details drawer item.
 *
 * Export the returned injectables from an `.injectable.tsx` file to have them auto-registered.
 */
export const createResourceViewInjectables = <Obj extends KubeObject>(typedDefinition: ResourceViewDefinition<Obj>) => {
  const definition = typedDefinition as unknown as ResourceViewDefinition<KubeObject>;
  const { descriptor } = definition;

  const apiInjectable = getInjectable({
    id: `${descriptor.id}-api`,
    instantiate: (di) => {
      assert(di.inject(storesAndApisCanBeCreatedInjectionToken), `${descriptor.id}-api is only available in certain environments`);

      return new KubeApi<KubeObject>({
        logError: di.inject(logErrorInjectionToken),
        logInfo: di.inject(logInfoInjectionToken),
        logWarn: di.inject(logWarningInjectionToken),
        maybeKubeApi: di.inject(maybeKubeApiInjectable),
      }, {
        objectConstructor: definition.objectConstructor,
        // CRDs and newer built-in groups are served in different versions depending on the installation
        checkPreferredVersion: true,
        fallbackApiBases: descriptor.fallbackApiBases,
      });
    },
    injectionToken: kubeApiInjectionToken,
  });

  const storeInjectable = getInjectable({
    id: `${descriptor.id}-store`,
    instantiate: (di) => {
      assert(di.inject(storesAndApisCanBeCreatedInjectionToken), `${descriptor.id}-store is only available in certain environments`);

      const context = descriptor.namespaced
        ? di.inject(clusterFrameContextForNamespacedResourcesInjectable)
        : di.inject(clusterFrameContextForClusterScopedResourcesInjectable);

      return new KubeObjectStore<KubeObject>({
        context,
        logger: di.inject(loggerInjectionToken),
      }, di.inject(apiInjectable));
    },
    injectionToken: kubeObjectStoreInjectionToken,
  });

  const ListComponent = withInjectables<{ store: KubeObjectStore<KubeObject> }>(
    ({ store }) => <ResourceList definition={definition} store={store} />,
    {
      getProps: (di, props) => ({
        ...props,
        store: di.inject(storeInjectable),
      }),
    },
  );

  const routeComponentInjectable = getInjectable({
    id: `${descriptor.id}-route-component`,
    instantiate: (di) => ({
      route: di.inject(definition.routes.routeInjectable),
      Component: ListComponent,
    }),
    injectionToken: routeSpecificComponentInjectionToken,
  });

  const sidebarItemInjectable = getInjectable({
    id: `sidebar-item-${descriptor.id}`,
    instantiate: (di) => {
      const route = di.inject(definition.routes.routeInjectable);

      return {
        parentId: definition.sidebar.parentId,
        title: descriptor.title,
        onClick: di.inject(definition.routes.navigateInjectable),
        isActive: di.inject(routeIsActiveInjectable, route),
        isVisible: route.isEnabled,
        orderNumber: definition.sidebar.orderNumber,
      };
    },
    injectionToken: sidebarItemInjectionToken,
  });

  const DetailsComponent = ({ object }: KubeObjectDetailsProps) => (
    <ResourceDetails definition={definition} object={object} />
  );

  const detailItemInjectable = getInjectable({
    id: `${descriptor.id}-detail-item`,
    instantiate: (di) => {
      const kubeObject = di.inject(currentKubeObjectInDetailsInjectable);

      return {
        Component: DetailsComponent,
        enabled: computed(() => isObjectOfResource(descriptor, kubeObject.value.get()?.object)),
        orderNumber: 10,
      };
    },
    injectionToken: kubeObjectDetailItemInjectionToken,
  });

  const descriptorInjectable = getInjectable({
    id: `${descriptor.id}-descriptor`,
    instantiate: () => descriptor,
    injectionToken: resourceViewDescriptorInjectionToken,
  });

  return {
    apiInjectable,
    storeInjectable,
    routeComponentInjectable,
    sidebarItemInjectable,
    detailItemInjectable,
    descriptorInjectable,
  };
};
