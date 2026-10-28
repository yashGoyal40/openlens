/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import { action, observable, runInAction } from "mobx";
import { interval } from "@k8slens/utilities";
import type { NamespaceUsageSnapshot, PodUsageReport, PodUsageSample, VolumeUsageSample } from "./pod-usage-history";
import { appendUsageSample, appendUsageSnapshot, appendVolumeSample, getPodUsageKey, toNamespaceSnapshots, toPodUsageSample } from "./pod-usage-history";
import requestVolumeUsageInjectable, { getVolumeUsageKey } from "../../storage-volume-claims/request-volume-usage.injectable";
import requestPodUsageInjectable from "./request-pod-usage.injectable";
import requestNamespacePodUsageInjectable from "./request-namespace-pod-usage.injectable";
import requestNodeUsageInjectable from "../../nodes/request-node-usage.injectable";

/**
 * How often what is open gets sampled, the default resolution of metrics-server
 */
const watchIntervalSeconds = 15;

export interface PodUsageHistory {
  /**
   * @param complete When the reports cover whole namespaces, they are also kept as snapshots of those namespaces
   */
  record: (reports: PodUsageReport[], complete: boolean) => void;
  getSamples: (namespace: string, name: string) => PodUsageSample[];
  getNamespaceSnapshots: (namespace: string) => NamespaceUsageSnapshot[];

  /**
   * Snapshots of every node, with the node names in place of pod names
   */
  getNodeSnapshots: () => NamespaceUsageSnapshot[];
  getVolumeSamples: (namespace: string, claim: string) => VolumeUsageSample[];

  /**
   * Each samples what is being looked at until the returned disposer is called
   */
  watchPod: (namespace: string, name: string) => () => void;
  watchNamespace: (namespace: string) => () => void;
  watchNodes: () => () => void;

  /**
   * @param getNodeNames The nodes of the pods that mount the claim, whose kubelets know its usage
   */
  watchVolume: (namespace: string, claim: string, getNodeNames: () => string[]) => () => void;
}

/**
 * metrics-server only knows the current usage, so the history behind the usage charts is collected here
 */
const podUsageHistoryInjectable = getInjectable({
  id: "pod-usage-history",

  instantiate: (di): PodUsageHistory => {
    const requestPodUsage = di.inject(requestPodUsageInjectable);
    const requestNamespacePodUsage = di.inject(requestNamespacePodUsageInjectable);
    const requestNodeUsage = di.inject(requestNodeUsageInjectable);
    const requestVolumeUsage = di.inject(requestVolumeUsageInjectable);
    const podSamples = observable.map<string, PodUsageSample[]>({}, { deep: false });
    const namespaceSnapshots = observable.map<string, NamespaceUsageSnapshot[]>({}, { deep: false });
    const nodeSnapshots = observable.box<NamespaceUsageSnapshot[]>([], { deep: false });
    const volumeSamples = observable.map<string, VolumeUsageSample[]>({}, { deep: false });
    const watchers = new Map<string, { count: number; stop: () => void }>();

    const record = action((reports: PodUsageReport[], complete: boolean) => {
      const now = Date.now();

      for (const report of reports) {
        const sample = toPodUsageSample(report);

        if (sample) {
          const key = getPodUsageKey(report.namespace, report.name);

          podSamples.set(key, appendUsageSample(podSamples.get(key) ?? [], sample, now));
        }
      }

      if (complete) {
        for (const [namespace, snapshot] of toNamespaceSnapshots(reports, now)) {
          namespaceSnapshots.set(namespace, appendUsageSnapshot(namespaceSnapshots.get(namespace) ?? [], snapshot, now));
        }
      }
    });

    const recordNodes = action((usage: Map<string, { cpu: number; memory: number }>) => {
      const now = Date.now();

      nodeSnapshots.set(appendUsageSnapshot(nodeSnapshots.get(), { time: now, pods: Object.fromEntries(usage) }, now));
    });

    /**
     * Polls once per key however many views are watching it
     */
    const watch = (key: string, poll: () => Promise<void>) => {
      let watcher = watchers.get(key);

      if (!watcher) {
        // metrics-server is not installed, or what is watched is gone
        const poller = interval(watchIntervalSeconds, () => void poll().catch(() => {}));

        poller.start(true);
        watcher = { count: 0, stop: () => poller.stop() };
        watchers.set(key, watcher);
      }

      watcher.count += 1;

      let disposed = false;

      return () => {
        const current = watchers.get(key);

        if (disposed) {
          return;
        }

        disposed = true;

        if (current && --current.count === 0) {
          current.stop();
          watchers.delete(key);
        }
      };
    };

    return {
      record,
      getSamples: (namespace, name) => podSamples.get(getPodUsageKey(namespace, name)) ?? [],
      getNamespaceSnapshots: (namespace) => namespaceSnapshots.get(namespace) ?? [],
      getNodeSnapshots: () => nodeSnapshots.get(),
      getVolumeSamples: (namespace, claim) => volumeSamples.get(getVolumeUsageKey(namespace, claim)) ?? [],
      watchPod: (namespace, name) => watch(`pod:${getPodUsageKey(namespace, name)}`, async () => {
        const report = await requestPodUsage(namespace, name);

        if (report) {
          record([report], false);
        }
      }),
      watchNamespace: (namespace) => watch(`namespace:${namespace}`, async () => {
        record(await requestNamespacePodUsage(namespace), true);
      }),
      watchNodes: () => watch("nodes", async () => {
        recordNodes(await requestNodeUsage());
      }),
      watchVolume: (namespace, claim, getNodeNames) => {
        const key = getVolumeUsageKey(namespace, claim);

        return watch(`volume:${key}`, async () => {
          for (const nodeName of getNodeNames()) {
            const usage = (await requestVolumeUsage(nodeName)).get(key);

            if (usage) {
              runInAction(() => volumeSamples.set(key, appendVolumeSample(volumeSamples.get(key) ?? [], { time: Date.now(), ...usage })));

              return;
            }
          }
        });
      },
    };
  },
});

export default podUsageHistoryInjectable;
