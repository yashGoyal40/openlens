/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { observer } from "mobx-react";
import React from "react";
import startCase from "lodash/startCase";
import type { Pod, PodSpecVolume } from "@k8slens/kube-object";
import { DrawerItemExpandable, DrawerTitle } from "../../../drawer";
import { Icon } from "@k8slens/icon";
import { VolumeVariant, getVolumeVariantKind } from "./variant";

export interface PodVolumesProps {
  pod: Pod;
}

const kindNames: Partial<Record<string, string>> = {
  awsElasticBlockStore: "AWS Elastic Block Store",
  cephfs: "CephFS",
  csi: "CSI",
  downwardAPI: "Downward API",
  fc: "Fibre Channel",
  gcePersistentDisk: "GCE Persistent Disk",
  iscsi: "iSCSI",
  nfs: "NFS",
  rbd: "RBD",
  scaleIO: "ScaleIO",
  storageos: "StorageOS",
  vsphereVolume: "vSphere Volume",
};

export const getVolumeKindName = (kind: string) => kindNames[kind] ?? startCase(kind);

/**
 * The volumes of a pod, grouped by their kind
 */
export const PodVolumes = observer(({ pod }: PodVolumesProps) => {
  const volumes = pod.getVolumes() ?? [];

  if (volumes.length === 0) {
    return null;
  }

  const groups = new Map<string, PodSpecVolume[]>();

  for (const volume of volumes) {
    const kind = getVolumeVariantKind(pod, volume) ?? "unknown";

    groups.set(kind, [...groups.get(kind) ?? [], volume]);
  }

  return (
    <>
      <DrawerTitle>Pod Volumes</DrawerTitle>
      {[...groups].map(([kind, group]) => (
        <DrawerItemExpandable
          key={kind}
          name={getVolumeKindName(kind)}
          summary={`${group.length} ${group.length === 1 ? "volume" : "volumes"}`}
          fullWidth
          data-testid={`pod-volumes-${kind}`}
        >
          {group.map(volume => (
            <div key={volume.name} className="volume">
              <div className="title flex gaps">
                <Icon small material="storage" />
                <span>{volume.name}</span>
              </div>
              <VolumeVariant
                pod={pod}
                volume={volume}
                hideKind
              />
            </div>
          ))}
        </DrawerItemExpandable>
      ))}
    </>
  );
});
