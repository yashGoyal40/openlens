/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

export interface ResourceDescriptorOptions {
  /**
   * Unique prefix used for the ids of all injectables of this resource view, e.g. "gateway-api-http-routes"
   */
  id: string;
  kind: string;
  group: string;

  /**
   * The versions of the resource that this view understands, preferred version first
   */
  versions: [string, ...string[]];

  /**
   * The plural (resource) name of the kind, e.g. "httproutes"
   */
  apiName: string;
  namespaced: boolean;

  /**
   * Title shown in the sidebar and in the list header
   */
  title: string;
}

export interface ResourceDescriptor extends ResourceDescriptorOptions {
  readonly apiBase: string;
  readonly fallbackApiBases: string[];
  readonly path: string;
}

const toApiBase = (group: string, version: string, apiName: string) => (
  group
    ? `/apis/${group}/${version}/${apiName}`
    : `/api/${version}/${apiName}`
);

export const describeResource = (options: ResourceDescriptorOptions): ResourceDescriptor => {
  const [preferredVersion, ...otherVersions] = options.versions;

  return {
    ...options,
    apiBase: toApiBase(options.group, preferredVersion, options.apiName),
    fallbackApiBases: otherVersions.map(version => toApiBase(options.group, version, options.apiName)),
    path: `/${options.id}`,
  };
};

/**
 * Matches by group and kind only, as the version used is the one preferred by the cluster
 */
export const isObjectOfResource = (descriptor: ResourceDescriptor, object: { kind?: string; apiVersion?: string } | undefined) => {
  if (!object || object.kind !== descriptor.kind || !object.apiVersion) {
    return false;
  }

  const group = object.apiVersion.includes("/")
    ? object.apiVersion.split("/")[0]
    : "";

  return group === descriptor.group;
};
