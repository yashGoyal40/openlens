/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import styles from "./cost-monitoring.module.scss";

import React, { useState } from "react";
import type { StrictReactNode } from "@k8slens/utilities";
import { cssNames } from "@k8slens/utilities";
import { Icon } from "@k8slens/icon";
import { Table, TableCell, TableHead, TableRow } from "../../../../renderer/components/table";
import { LineProgress } from "../../../../renderer/components/line-progress";
import type { CostAllocationRow, CostAllocationTotals } from "../opencost-allocation";
import { getCostAllocationTotals, isSpecialAllocationName, specialAllocationNames } from "../opencost-allocation";
import type { FormatCost } from "../format-cost";
import { formatEfficiency, formatShare } from "../format-cost";

type CostKey = "cpuCost" | "gpuCost" | "ramCost" | "pvCost" | "networkCost" | "loadBalancerCost" | "sharedCost" | "totalCost";
type EfficiencyKey = "cpuEfficiency" | "ramEfficiency";
type SortBy = "name" | CostKey | EfficiencyKey | "share";
type OrderBy = "asc" | "desc";

interface Column {
  id: SortBy;
  title: string;
  className: string;
  sortValue: (row: CostAllocationRow) => string | number;
  value: (row: CostAllocationRow) => StrictReactNode;
  total: (totals: CostAllocationTotals) => StrictReactNode;
}

const costColumns: [CostKey, string][] = [
  ["cpuCost", "CPU"],
  ["gpuCost", "GPU"],
  ["ramCost", "RAM"],
  ["pvCost", "PV"],
  ["networkCost", "Network"],
  ["loadBalancerCost", "Load Balancer"],
  ["sharedCost", "Shared"],
  ["totalCost", "Total"],
];

const efficiencyColumns: [EfficiencyKey, string][] = [
  ["cpuEfficiency", "CPU Efficiency"],
  ["ramEfficiency", "RAM Efficiency"],
];

const getColumns = (formatCost: FormatCost, grandTotal: number): Column[] => {
  const shareOf = (cost: number) => (grandTotal > 0 ? cost / grandTotal : 0);

  return [
    {
      id: "name",
      title: "Name",
      className: styles.nameCell,
      sortValue: row => row.name,
      value: row => (
        isSpecialAllocationName(row.name)
          ? <span className={styles.special} title={row.name}>{specialAllocationNames[row.name]}</span>
          : row.name
      ),
      total: () => "Total",
    },
    ...costColumns.map(([key, title]): Column => ({
      id: key,
      title,
      className: styles.numberCell,
      sortValue: row => row[key],
      value: row => formatCost(row[key]),
      total: totals => formatCost(totals[key]),
    })),
    ...efficiencyColumns.map(([key, title]): Column => ({
      id: key,
      title,
      className: styles.numberCell,
      sortValue: row => row[key] ?? -1,
      value: row => formatEfficiency(row[key]),
      total: totals => formatEfficiency(totals[key]),
    })),
    {
      id: "share",
      title: "Share",
      className: styles.shareCell,
      sortValue: row => row.totalCost,
      value: row => (
        <div className={styles.shareBar}>
          <LineProgress value={shareOf(row.totalCost) * 100} />
          <span>{formatShare(shareOf(row.totalCost))}</span>
        </div>
      ),
      total: totals => (
        <div className={styles.shareBar}>
          <span>{formatShare(shareOf(totals.totalCost))}</span>
        </div>
      ),
    },
  ];
};

const compare = (left: string | number, right: string | number) => (
  typeof left === "number" && typeof right === "number"
    ? left - right
    : String(left).localeCompare(String(right))
);

export interface CostAllocationTableProps {
  rows: CostAllocationRow[];
  formatCost: FormatCost;
}

export function CostAllocationTable({ rows, formatCost }: CostAllocationTableProps) {
  const [sorting, setSorting] = useState<{ sortBy: SortBy; orderBy: OrderBy }>({ sortBy: "totalCost", orderBy: "desc" });
  const totals = getCostAllocationTotals(rows);
  const columns = getColumns(formatCost, totals.totalCost);
  const sortColumn = columns.find(column => column.id === sorting.sortBy) ?? columns[0];
  const direction = sorting.orderBy === "asc" ? 1 : -1;
  const sortedRows = [...rows].sort((left, right) => (
    direction * compare(sortColumn.sortValue(left), sortColumn.sortValue(right))
  ));

  // names start ascending and amounts descending, a second click flips the order
  const sortBy = (id: SortBy) => setSorting(previous => {
    if (previous.sortBy === id) {
      return { sortBy: id, orderBy: previous.orderBy === "asc" ? "desc" : "asc" };
    }

    return { sortBy: id, orderBy: id === "name" ? "asc" : "desc" };
  });

  return (
    <Table
      className={styles.table}
      autoSize={false}
      scrollable={false}
      selectable={false}
    >
      <TableHead flat>
        {columns.map(column => (
          <TableCell
            key={column.id}
            className={cssNames(column.className, styles.sortableCell)}
            onClick={() => sortBy(column.id)}
            data-testid={`cost-allocation-header-${column.id}`}
          >
            {column.title}
            {sorting.sortBy === column.id && (
              <Icon
                small
                className={styles.sortIcon}
                material={sorting.orderBy === "asc" ? "arrow_drop_up" : "arrow_drop_down"}
              />
            )}
          </TableCell>
        ))}
      </TableHead>
      {sortedRows.map(row => (
        <TableRow key={row.name} testId={`cost-allocation-row-${row.name}`}>
          {columns.map(column => (
            <TableCell key={column.id} className={column.className}>
              {column.value(row)}
            </TableCell>
          ))}
        </TableRow>
      ))}
      <TableRow className={styles.totals} testId="cost-allocation-totals">
        {columns.map(column => (
          <TableCell key={column.id} className={column.className}>
            {column.total(totals)}
          </TableCell>
        ))}
      </TableRow>
    </Table>
  );
}
