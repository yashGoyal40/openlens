/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import styles from "./resource-views.module.scss";

import React from "react";
import type { StrictReactNode } from "@k8slens/utilities";
import { DrawerTitle } from "../../../../renderer/components/drawer";
import { Table, TableCell, TableHead, TableRow } from "../../../../renderer/components/table";

export interface ResourceTableColumn<Row> {
  title: string;
  value: (row: Row, index: number) => StrictReactNode;
  className?: string;
}

export interface ResourceTableProps<Row> {
  title?: string;
  rows: Row[] | undefined;
  columns: ResourceTableColumn<Row>[];
}

/**
 * A small table for listing nested items (listeners, rules, ...) inside the details drawer
 */
export function ResourceTable<Row>({ title, rows, columns }: ResourceTableProps<Row>) {
  if (!rows?.length) {
    return null;
  }

  return (
    <>
      {title && <DrawerTitle>{title}</DrawerTitle>}
      <Table className={styles.subTable}>
        <TableHead flat>
          {columns.map(column => (
            <TableCell key={column.title} className={column.className}>{column.title}</TableCell>
          ))}
        </TableHead>
        {rows.map((row, index) => (
          <TableRow key={index}>
            {columns.map(column => (
              <TableCell key={column.title} className={column.className}>
                {column.value(row, index)}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </Table>
    </>
  );
}
