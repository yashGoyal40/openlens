/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import styles from "./cluster-glyph.module.scss";

import React from "react";
import randomColor from "randomcolor";
import { cssNames } from "@k8slens/utilities";
import type { CatalogEntity } from "../../../common/catalog";
import { getIconBackground } from "../../../common/catalog/helpers";

const sides = 7;
const center = 16;

const pointOnCircle = (radius: number, index: number, count: number) => {
  const angle = (-90 + (index * 360) / count) * (Math.PI / 180);

  return [
    center + radius * Math.cos(angle),
    center + radius * Math.sin(angle),
  ].map(value => Number(value.toFixed(2)));
};

const heptagon = Array.from({ length: sides }, (_, index) => pointOnCircle(15, index, sides).join(",")).join(" ");
const spokes = Array.from({ length: sides }, (_, index) => [pointOnCircle(2.6, index, sides), pointOnCircle(9.6, index, sides)]);

/**
 * The colour a catalog entity is shown with: its own icon background, or the same
 * seeded colour the avatar of the entity uses.
 */
export const getEntityColor = (entity: CatalogEntity) => (
  getIconBackground(entity)
  ?? randomColor({ seed: `${entity.getName()}-${entity.metadata.source}`, luminosity: "dark" })
);

export interface ClusterGlyphProps {
  color: string;
  size?: number;
  className?: string;
}

/**
 * A heptagon with a helm wheel in the colour of the cluster
 */
export const ClusterGlyph = ({ color, size = 16, className }: ClusterGlyphProps) => (
  <svg
    className={cssNames(styles.ClusterGlyph, className)}
    viewBox="0 0 32 32"
    width={size}
    height={size}
    aria-hidden
    data-testid="cluster-glyph"
  >
    <polygon points={heptagon} fill={color} />
    <g className={styles.wheel}>
      <circle
        cx={center}
        cy={center}
        r={6.6}
        fill="none" />
      {spokes.map(([from, to], index) => (
        <line
          key={index}
          x1={from[0]}
          y1={from[1]}
          x2={to[0]}
          y2={to[1]} />
      ))}
      <circle
        cx={center}
        cy={center}
        r={2.2}
        className={styles.hub} />
    </g>
  </svg>
);
