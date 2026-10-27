/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import type { IComputedValue } from "mobx";
import { computed } from "mobx";
import { getInjectable } from "@ogre-tools/injectable";
import type { Ingress, KubeObject, Service } from "@k8slens/kube-object";
import { computedOr } from "@k8slens/utilities";
import type { KubeObjectStore } from "../../../common/k8s-api/kube-object.store";
import type { SubscribableStore } from "../../../renderer/kube-watch-api/kube-watch-api";
import { shouldShowResourceInjectionToken } from "../../cluster/showing-kube-resources/common/allowed-resources-injection-token";
import deploymentStoreInjectable from "../../../renderer/components/workloads-deployments/store.injectable";
import statefulSetStoreInjectable from "../../../renderer/components/workloads-statefulsets/store.injectable";
import daemonSetStoreInjectable from "../../../renderer/components/workloads-daemonsets/store.injectable";
import jobStoreInjectable from "../../../renderer/components/workloads-jobs/store.injectable";
import cronJobStoreInjectable from "../../../renderer/components/workloads-cronjobs/store.injectable";
import serviceStoreInjectable from "../../../renderer/components/network-services/store.injectable";
import ingressStoreInjectable from "../../../renderer/components/network-ingresses/ingress-store.injectable";
import type { Application } from "./applications";
import { groupApplications } from "./applications";

interface Source<K extends KubeObject> {
  store: KubeObjectStore<K, any, any>;
  isAllowed: IComputedValue<boolean>;
}

export type ApplicationsStore = SubscribableStore & {
  readonly isLoaded: boolean;
};

export interface ApplicationsData {
  /**
   * The stores of the kinds the user may list, which need to be subscribed to while showing applications
   */
  readonly stores: IComputedValue<ApplicationsStore[]>;
  readonly isLoaded: IComputedValue<boolean>;

  /**
   * The applications in the selected namespaces
   */
  readonly applications: IComputedValue<Application[]>;
  readonly services: IComputedValue<Service[]>;
  readonly ingresses: IComputedValue<Ingress[]>;
}

const applicationsDataInjectable = getInjectable({
  id: "applications-data",

  instantiate: (di): ApplicationsData => {
    const isAllowed = (apiName: string, group: string) => di.inject(shouldShowResourceInjectionToken, { apiName, group });
    const source = <K extends KubeObject>(store: KubeObjectStore<K, any, any>, isAllowed: IComputedValue<boolean>): Source<K> => ({ store, isAllowed });

    const deployments = source(di.inject(deploymentStoreInjectable), isAllowed("deployments", "apps"));
    const statefulSets = source(di.inject(statefulSetStoreInjectable), isAllowed("statefulsets", "apps"));
    const daemonSets = source(di.inject(daemonSetStoreInjectable), isAllowed("daemonsets", "apps"));
    const jobs = source(di.inject(jobStoreInjectable), isAllowed("jobs", "batch"));
    const cronJobs = source(di.inject(cronJobStoreInjectable), isAllowed("cronjobs", "batch"));
    const services = source(di.inject(serviceStoreInjectable), isAllowed("services", ""));
    const ingresses = source(
      di.inject(ingressStoreInjectable),
      computedOr(isAllowed("ingresses", "networking.k8s.io"), isAllowed("ingresses", "extensions")),
    );

    const sources: { store: ApplicationsStore; isAllowed: IComputedValue<boolean> }[] = [
      deployments,
      statefulSets,
      daemonSets,
      jobs,
      cronJobs,
      services,
      ingresses,
    ];
    const itemsOf = <K extends KubeObject>({ store, isAllowed }: Source<K>) => (
      isAllowed.get()
        ? store.contextItems
        : []
    );

    const stores = computed(() => sources.filter(({ isAllowed }) => isAllowed.get()).map(({ store }) => store));

    return {
      stores,
      isLoaded: computed(() => stores.get().every(store => store.isLoaded)),
      applications: computed(() => groupApplications({
        deployments: itemsOf(deployments),
        statefulSets: itemsOf(statefulSets),
        daemonSets: itemsOf(daemonSets),
        jobs: itemsOf(jobs),
        cronJobs: itemsOf(cronJobs),
      })),
      services: computed(() => itemsOf(services)),
      ingresses: computed(() => itemsOf(ingresses)),
    };
  },
});

export default applicationsDataInjectable;
