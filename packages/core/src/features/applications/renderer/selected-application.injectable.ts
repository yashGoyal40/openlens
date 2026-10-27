/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { computed } from "mobx";
import { getInjectable } from "@ogre-tools/injectable";
import routePathParametersInjectable from "../../../renderer/routes/route-path-parameters.injectable";
import applicationsRouteInjectable from "../common/applications-route.injectable";
import type { ApplicationReference } from "./applications";

/**
 * The application whose details are open, as given by the path of the applications route
 */
const selectedApplicationInjectable = getInjectable({
  id: "applications-selected-application",

  instantiate: (di) => {
    const route = di.inject(applicationsRouteInjectable);
    const pathParameters = di.inject(routePathParametersInjectable, route);

    return computed((): ApplicationReference | undefined => {
      const { namespace, name } = pathParameters.get();

      return namespace && name
        ? { namespace, name }
        : undefined;
    });
  },
});

export default selectedApplicationInjectable;
