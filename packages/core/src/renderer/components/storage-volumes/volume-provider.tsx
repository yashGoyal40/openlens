/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import React from "react";
import startCase from "lodash/startCase";
import type { PersistentVolume } from "@k8slens/kube-object";
import { DrawerItem, DrawerTitle } from "../drawer";

/**
 * The volume sources a persistent volume can have, by their field in the spec
 */
const providerNames: Record<string, string> = {
  csi: "Container Storage Interface",
  awsElasticBlockStore: "AWS Elastic Block Store",
  azureDisk: "Azure Disk",
  azureFile: "Azure File",
  cephfs: "CephFS",
  cinder: "Cinder",
  fc: "Fibre Channel",
  flexVolume: "FlexVolume",
  flocker: "Flocker",
  gcePersistentDisk: "GCE Persistent Disk",
  glusterfs: "GlusterFS",
  hostPath: "Host Path",
  iscsi: "iSCSI",
  local: "Local",
  nfs: "Network File System",
  photonPersistentDisk: "Photon Persistent Disk",
  portworxVolume: "Portworx",
  quobyte: "Quobyte",
  rbd: "RBD",
  scaleIO: "ScaleIO",
  storageos: "StorageOS",
  vsphereVolume: "vSphere Volume",
};

type ProviderFields = Partial<Record<string, unknown>>;

const fieldNames: Partial<Record<string, string>> = {
  fsType: "FS Type",
  readOnly: "Read Only",
};

const isValue = (value: unknown): value is string | number | boolean => (
  typeof value === "string" || typeof value === "number" || typeof value === "boolean"
);

/**
 * Flat fields keep their name, maps such as the attributes of a CSI volume add a row per key
 */
export function getProviderRows(fields: ProviderFields): [string, string][] {
  return Object.entries(fields).flatMap(([name, value]): [string, string][] => {
    if (isValue(value)) {
      return [[fieldNames[name] ?? startCase(name), String(value)]];
    }

    if (value && typeof value === "object" && !Array.isArray(value)) {
      const entries = Object.entries(value);

      return entries.every(([, each]) => isValue(each))
        ? entries.map(([key, each]) => [key, String(each)])
        : [];
    }

    return [];
  });
}

/**
 * Where a persistent volume really lives, such as the CSI driver and its attributes
 */
export function VolumeProvider({ volume }: { volume: PersistentVolume }) {
  const spec = volume.spec as PersistentVolume["spec"] & ProviderFields;
  const field = Object.keys(providerNames).find(name => spec[name]);

  if (!field) {
    return null;
  }

  const fields = spec[field] as ProviderFields;

  return (
    <>
      <DrawerTitle>Provider</DrawerTitle>
      <DrawerItem name="Source Provider">
        {providerNames[field]}
      </DrawerItem>
      {getProviderRows(fields).map(([name, value]) => (
        <DrawerItem key={name} name={name}>
          {value}
        </DrawerItem>
      ))}
    </>
  );
}
