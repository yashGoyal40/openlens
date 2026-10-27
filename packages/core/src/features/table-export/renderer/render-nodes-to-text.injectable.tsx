/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import { DiContextProvider } from "@ogre-tools/injectable-react";
import { reactApplicationHigherOrderComponentInjectionToken } from "@k8slens/react-application";
import type { StrictReactNode } from "@k8slens/utilities";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { elementToText } from "./element-to-text";

/**
 * Converts react nodes into the plain text a user would see if they were rendered
 */
export type RenderNodesToText = (nodes: StrictReactNode[]) => string[];

/**
 * How many nodes are rendered together, a compromise between speed and the impact of a
 * single failing node
 */
const chunkSize = 500;

const isPlainText = (node: StrictReactNode): node is string | number => (
  typeof node === "string" || typeof node === "number"
);

const renderNodesToTextInjectable = getInjectable({
  id: "render-nodes-to-text",

  instantiate: (di): RenderNodesToText => {
    const higherOrderComponents = di.injectMany(reactApplicationHigherOrderComponentInjectionToken);
    const parser = new DOMParser();

    // Renders within the same providers (DI, routing, theme) as the application itself
    const renderToHtml = (children: StrictReactNode) => renderToStaticMarkup(
      <DiContextProvider value={{ di }}>
        {higherOrderComponents.reduceRight<StrictReactNode>(
          (content, HigherOrderComponent) => <HigherOrderComponent>{content}</HigherOrderComponent>,
          children,
        )}
      </DiContextProvider>,
    );

    // DOMParser creates an inert document so nothing in the markup is loaded or executed
    const parseHtml = (html: string) => parser.parseFromString(`<!DOCTYPE html><body>${html}</body>`, "text/html").body;

    const renderSingle = (node: StrictReactNode) => {
      try {
        return elementToText(parseHtml(renderToHtml(node)));
      } catch {
        return "";
      }
    };

    const renderChunk = (nodes: StrictReactNode[]): string[] => {
      try {
        const html = renderToHtml(
          <div>
            {nodes.map((node, index) => <div key={index}>{node}</div>)}
          </div>,
        );
        const cells = Array.from(parseHtml(html).firstElementChild?.children ?? []);

        if (cells.length === nodes.length) {
          return cells.map(elementToText);
        }
      } catch {
        // fallback to rendering each node by itself so that only the failing ones are lost
      }

      return nodes.map(renderSingle);
    };

    return (nodes) => {
      const result = nodes.map(node => (
        isPlainText(node)
          ? String(node).trim()
          : ""
      ));
      const toRender = nodes
        .map((node, index) => ({ node, index }))
        .filter(({ node }) => node !== null && node !== undefined && typeof node !== "boolean" && !isPlainText(node));

      for (let start = 0; start < toRender.length; start += chunkSize) {
        const chunk = toRender.slice(start, start + chunkSize);
        const texts = renderChunk(chunk.map(({ node }) => node));

        chunk.forEach(({ index }, chunkIndex) => {
          result[index] = texts[chunkIndex];
        });
      }

      return result;
    };
  },
});

export default renderNodesToTextInjectable;
