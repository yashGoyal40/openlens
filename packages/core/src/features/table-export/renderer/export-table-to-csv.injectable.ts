/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import type { ItemObject, TableCellProps, TableSortCallbacks, TableSortParams } from "@k8slens/list-layout";
import type { StrictReactNode } from "@k8slens/utilities";
import { isReactNode } from "@k8slens/utilities";
import openSaveFileDialogInjectable from "../../../renderer/utils/save-file.injectable";
import isTableColumnHiddenInjectable from "../../user-preferences/common/is-table-column-hidden.injectable";
import tableModelInjectable from "../../../renderer/components/table/table-model/table-model.injectable";
import { getSorted } from "../../../renderer/components/table/sorting";
import renderNodesToTextInjectable from "./render-nodes-to-text.injectable";
import { toCsv } from "./to-csv";
import { getCsvFileName } from "./csv-file-name";

export interface ExportTableToCsvArgs<Item extends ItemObject> {
  /**
   * Used for column visibility, sorting state and the file name
   */
  tableId?: string;

  /**
   * Used for the file name when there is no `tableId`
   */
  title?: string;

  /**
   * Whether the visibility of the columns can be configured by the user
   */
  isConfigurable?: boolean;

  /**
   * The items to export, already filtered
   */
  items: Item[];

  /**
   * The header cells, the index of each header matches the index of the content cell
   */
  header: (TableCellProps | undefined | null)[];
  renderContents: (item: Item) => (StrictReactNode | TableCellProps)[];

  sortingCallbacks?: TableSortCallbacks<Item>;
  sortByDefault?: Partial<TableSortParams>;
}

export type ExportTableToCsv = <Item extends ItemObject>(args: ExportTableToCsvArgs<Item>) => void;

const getCellNode = (cell: StrictReactNode | TableCellProps | undefined): StrictReactNode => {
  if (isReactNode(cell)) {
    return cell;
  }

  // The same precedence as <TableCell />
  return cell.title || cell.children as StrictReactNode;
};

const exportTableToCsvInjectable = getInjectable({
  id: "export-table-to-csv",

  instantiate: (di): ExportTableToCsv => {
    const openSaveFileDialog = di.inject(openSaveFileDialogInjectable);
    const isTableColumnHidden = di.inject(isTableColumnHiddenInjectable);
    const tableModel = di.inject(tableModelInjectable);
    const renderNodesToText = di.inject(renderNodesToTextInjectable);

    const isColumnShown = (tableId: string | undefined, isConfigurable: boolean | undefined, { id, showWithColumn }: TableCellProps) => (
      !isConfigurable
      || !tableId
      || !isTableColumnHidden(tableId, id, showWithColumn)
    );

    const sortAsDisplayed = <Item>(items: Item[], tableId: string | undefined, sortingCallbacks: TableSortCallbacks<Item> | undefined, sortByDefault: Partial<TableSortParams> | undefined) => {
      if (!tableId || !sortingCallbacks) {
        return items;
      }

      // The same sorting parameters as <Table /> uses
      const { sortBy, orderBy } = {
        ...sortByDefault,
        ...tableModel.getSortParams(tableId),
      };

      if (!sortBy || !orderBy) {
        return items;
      }

      return getSorted(items, sortingCallbacks[sortBy], orderBy);
    };

    return ({ tableId, title, isConfigurable, items, header, renderContents, sortingCallbacks, sortByDefault }) => {
      const columns = header
        .map((cell, index) => ({ cell, index }))
        .filter((column): column is { cell: TableCellProps; index: number } => Boolean(column.cell))
        .filter(({ cell }) => isColumnShown(tableId, isConfigurable, cell));
      const titles = renderNodesToText(columns.map(({ cell }) => cell.title));
      const exportedColumns = columns.filter((column, index) => titles[index] !== "");

      if (exportedColumns.length === 0) {
        return;
      }

      const sortedItems = sortAsDisplayed(items, tableId, sortingCallbacks, sortByDefault);
      const nodes = sortedItems.flatMap(item => {
        const contents = renderContents(item);

        return exportedColumns.map(({ index }) => getCellNode(contents[index]));
      });
      const texts = renderNodesToText(nodes);
      const rows = sortedItems.map((item, rowIndex) => (
        texts.slice(rowIndex * exportedColumns.length, (rowIndex + 1) * exportedColumns.length)
      ));
      const headerRow = titles.filter(title => title !== "");
      const fileName = getCsvFileName(tableId || title || "table", new Date());

      openSaveFileDialog(fileName, toCsv([headerRow, ...rows]), "text/csv");
    };
  },
});

export default exportTableToCsvInjectable;
