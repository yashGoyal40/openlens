/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectionToken } from "@ogre-tools/injectable";
import type { ResourceDescriptor } from "./resource-descriptor";

/**
 * Resources that have a dedicated view, so that generic (custom resource) details are not shown for them
 */
export const resourceViewDescriptorInjectionToken = getInjectionToken<ResourceDescriptor>({
  id: "resource-view-descriptor-injection-token",
});
