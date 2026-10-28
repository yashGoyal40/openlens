/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./volume-details.scss";

import React from "react";
import { Link } from "react-router-dom";
import { observer } from "mobx-react";
import { DrawerItem, DrawerTitle } from "../drawer";
import { VolumeProvider } from "./volume-provider";
import { Badge } from "../badge";
import type { PersistentVolumeClaimApi, StorageClassApi } from "@k8slens/kube-api";
import { PersistentVolume } from "@k8slens/kube-object";
import type { KubeObjectDetailsProps } from "../kube-object-details";
import type { Logger } from "@k8slens/logger";
import { stopPropagation } from "@k8slens/utilities";
import { withInjectables } from "@ogre-tools/injectable-react";
import { loggerInjectionToken } from "@k8slens/logger";
import type { GetDetailsUrl } from "../kube-detail-params/get-details-url.injectable";
import getDetailsUrlInjectable from "../kube-detail-params/get-details-url.injectable";
import { persistentVolumeClaimApiInjectable, storageClassApiInjectable } from "@k8slens/kube-api-specifics";

export interface PersistentVolumeDetailsProps extends KubeObjectDetailsProps<PersistentVolume> {
}

interface Dependencies {
  logger: Logger;
  getDetailsUrl: GetDetailsUrl;
  storageClassApi: StorageClassApi;
  persistentVolumeClaimApi: PersistentVolumeClaimApi;
}

@observer
class NonInjectedPersistentVolumeDetails extends React.Component<PersistentVolumeDetailsProps & Dependencies> {
  render() {
    const {
      object: volume,
      storageClassApi,
      getDetailsUrl,
      logger,
      persistentVolumeClaimApi,
    } = this.props;

    if (!volume) {
      return null;
    }

    if (!(volume instanceof PersistentVolume)) {
      logger.error("[PersistentVolumeDetails]: passed object that is not an instanceof PersistentVolume", volume);

      return null;
    }

    const { accessModes, capacity, persistentVolumeReclaimPolicy, storageClassName, claimRef, mountOptions, volumeMode } = volume.spec;

    const storageClassDetailsUrl = getDetailsUrl(storageClassApi.formatUrlForNotListing({
      name: storageClassName,
    }));

    return (
      <div className="PersistentVolumeDetails">
        <DrawerItem name="Capacity">
          {capacity?.storage}
        </DrawerItem>

        {mountOptions && (
          <DrawerItem name="Mount Options">
            {mountOptions.join(", ")}
          </DrawerItem>
        )}

        <DrawerItem name="Access Modes">
          {accessModes?.join(", ")}
        </DrawerItem>
        <DrawerItem name="Reclaim Policy">
          {persistentVolumeReclaimPolicy}
        </DrawerItem>
        <DrawerItem name="Storage Class Name">
          <Link
            key="link"
            to={storageClassDetailsUrl}
            onClick={stopPropagation}
          >
            {storageClassName}
          </Link>
        </DrawerItem>
        <DrawerItem name="Status" labelsOnly>
          <Badge label={volume.getStatus()} />
        </DrawerItem>
        <DrawerItem name="Volume Mode" hidden={!volumeMode}>
          {volumeMode}
        </DrawerItem>

        <VolumeProvider volume={volume} />

        {claimRef && (
          <>
            <DrawerTitle>Claim</DrawerTitle>
            <DrawerItem name="Type">
              {claimRef.kind}
            </DrawerItem>
            <DrawerItem name="Name">
              <Link to={getDetailsUrl(persistentVolumeClaimApi.formatUrlForNotListing(claimRef))}>
                {claimRef.name}
              </Link>
            </DrawerItem>
            <DrawerItem name="Namespace">
              {claimRef.namespace}
            </DrawerItem>
          </>
        )}
      </div>
    );
  }
}

export const PersistentVolumeDetails = withInjectables<Dependencies, PersistentVolumeDetailsProps>(NonInjectedPersistentVolumeDetails, {
  getProps: (di, props) => ({
    ...props,
    logger: di.inject(loggerInjectionToken),
    getDetailsUrl: di.inject(getDetailsUrlInjectable),
    persistentVolumeClaimApi: di.inject(persistentVolumeClaimApiInjectable),
    storageClassApi: di.inject(storageClassApiInjectable),
  }),
});
