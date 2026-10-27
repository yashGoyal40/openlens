/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import createStorageInjectable from "../../utils/create-storage/create-storage.injectable";

/**
 * User chosen column widths in pixels, by table id and then column id
 */
export type TableColumnWidths = Partial<Record<string, Partial<Record<string, number>>>>;

const tableColumnWidthsInjectable = getInjectable({
  id: "table-column-widths",

  instantiate: (di) => {
    const createStorage = di.inject(createStorageInjectable);

    return createStorage<TableColumnWidths>("table_column_widths", {});
  },
});

export default tableColumnWidthsInjectable;
