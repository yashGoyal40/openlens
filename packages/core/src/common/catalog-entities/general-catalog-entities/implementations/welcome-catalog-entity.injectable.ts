/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import { GeneralEntity } from "../../index";
import { buildURL } from "@k8slens/utilities";
import welcomeRouteInjectable from "../../../front-end-routing/routes/welcome/welcome-route.injectable";

/**
 * The catalog is the home page, so this entity is no longer listed in the catalog or kept in the
 * hotbar. It is kept for the hotbar migrations.
 */
const welcomeCatalogEntityInjectable = getInjectable({
  id: "general-catalog-entity-for-welcome",

  instantiate: (di) => {
    const route = di.inject(welcomeRouteInjectable);
    const url = buildURL(route.path);

    return new GeneralEntity({
      metadata: {
        uid: "welcome-page-entity",
        name: "Welcome Page",
        source: "app",
        labels: {},
      },
      spec: {
        path: url,
        icon: {
          material: "home",
          background: "#3d90ce",
        },
      },
      status: {
        phase: "active",
      },
    });
  },
});

export default welcomeCatalogEntityInjectable;
