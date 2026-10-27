/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import React, { useRef } from "react";
import { ResizeDirection, ResizeGrowthDirection, ResizeSide, ResizingAnchor } from "@k8slens/resizing-anchor";
import { stopPropagation } from "@k8slens/utilities";

export const minColumnWidth = 40;
export const maxColumnWidth = 2000;

export interface ColumnResizeAnchorProps {
  columnId: string;
  getWidth: () => number | undefined;
  onResize: (width: number) => void;
  onReset: () => void;
}

/**
 * The click that ends a drag lands on the header cell and would toggle sorting
 */
const swallowNextClick = () => {
  const swallow = (event: MouseEvent) => event.stopPropagation();

  window.addEventListener("click", swallow, { capture: true, once: true });
  setTimeout(() => window.removeEventListener("click", swallow, { capture: true }));
};

export const ColumnResizeAnchor = ({ columnId, getWidth, onResize, onReset }: ColumnResizeAnchorProps) => {
  const ref = useRef<HTMLSpanElement>(null);
  const measureWidth = () => ref.current?.closest(".TableCell")?.getBoundingClientRect().width ?? minColumnWidth;

  return (
    <span
      ref={ref}
      className="column-resize-anchor"
      onClick={stopPropagation}
      data-testid={`column-resize-anchor-${columnId}`}
    >
      <ResizingAnchor
        direction={ResizeDirection.HORIZONTAL}
        placement={ResizeSide.TRAILING}
        growthDirection={ResizeGrowthDirection.LEFT_TO_RIGHT}
        getCurrentExtent={() => getWidth() ?? measureWidth()}
        onDrag={onResize}
        onEnd={swallowNextClick}
        onDoubleClick={onReset}
        minExtent={minColumnWidth}
        maxExtent={maxColumnWidth}
      />
    </span>
  );
};
