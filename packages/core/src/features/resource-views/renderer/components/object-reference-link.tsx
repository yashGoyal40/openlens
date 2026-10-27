/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import React from "react";
import { Link } from "react-router-dom";
import { withInjectables } from "@ogre-tools/injectable-react";
import type { KubeObject } from "@k8slens/kube-object";
import type { ApiManager } from "../../../../common/k8s-api/api-manager";
import apiManagerInjectable from "../../../../common/k8s-api/api-manager/manager.injectable";
import type { GetDetailsUrl } from "../../../../renderer/components/kube-detail-params/get-details-url.injectable";
import getDetailsUrlInjectable from "../../../../renderer/components/kube-detail-params/get-details-url.injectable";

export interface ObjectReference {
  kind?: string;
  name: string;
  namespace?: string;

  /**
   * Either the full apiVersion (e.g. "apps/v1") or only the group (e.g. "gateway.networking.k8s.io")
   */
  apiVersion?: string;
  group?: string;

  /**
   * The plural resource name (e.g. "pods"), for references that carry it instead of the kind
   */
  resource?: string;
}

export interface ObjectReferenceLinkProps {
  reference: ObjectReference;

  /**
   * The object holding the reference, used to default the namespace
   */
  parent: KubeObject;
  showKind?: boolean;

  /**
   * Omit the namespace from the label, e.g. when a table shows it in its own column
   */
  hideNamespace?: boolean;
}

interface Dependencies {
  apiManager: ApiManager;
  getDetailsUrl: GetDetailsUrl;
}

const NonInjectedObjectReferenceLink = ({ reference, parent, showKind = false, hideNamespace = false, apiManager, getDetailsUrl }: ObjectReferenceLinkProps & Dependencies) => {
  const namespace = reference.namespace ?? parent.getNs();
  const label = [
    showKind && reference.kind,
    !hideNamespace && namespace && namespace !== parent.getNs() ? `${namespace}/${reference.name}` : reference.name,
  ].filter(Boolean).join(" ");

  const matchesGroup = (api: { apiGroup?: string; apiVersionWithGroup: string }) => (
    reference.apiVersion
      ? api.apiVersionWithGroup === reference.apiVersion || api.apiGroup === reference.apiVersion
      : (api.apiGroup ?? "") === (reference.group ?? "")
  );

  const api = reference.kind
    ? apiManager.getApi(api => api.kind === reference.kind && matchesGroup(api))
    : reference.resource
      ? apiManager.getApi(api => api.apiResource === reference.resource && matchesGroup(api))
      : undefined;

  if (!api) {
    return <>{label}</>;
  }

  const selfLink = api.formatUrlForNotListing({
    name: reference.name,
    namespace: api.isNamespaced ? namespace : undefined,
  });

  return (
    <Link to={getDetailsUrl(selfLink)} onClick={event => event.stopPropagation()}>
      {label}
    </Link>
  );
};

export const ObjectReferenceLink = withInjectables<Dependencies, ObjectReferenceLinkProps>(NonInjectedObjectReferenceLink, {
  getProps: (di, props) => ({
    ...props,
    apiManager: di.inject(apiManagerInjectable),
    getDetailsUrl: di.inject(getDetailsUrlInjectable),
  }),
});
