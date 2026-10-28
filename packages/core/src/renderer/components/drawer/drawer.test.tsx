/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import React from "react";
import { fireEvent } from "@testing-library/react";
import { getDiForUnitTesting } from "../../getDiForUnitTesting";
import type { DiRender } from "../test-utils/renderFor";
import { renderFor } from "../test-utils/renderFor";
import { Drawer } from "./drawer";

describe("<Drawer />", () => {
  let render: DiRender;
  let onClose: jest.Mock;

  beforeEach(() => {
    render = renderFor(getDiForUnitTesting());
    onClose = jest.fn();
  });

  it("stays open when a click inside replaces what was clicked", () => {
    const result = render(
      <Drawer
        open
        title="Some title"
        onClose={onClose}
        usePortal={false}
      >
        <div data-testid="row">row</div>
      </Drawer>,
    );
    const row = result.getByTestId("row");

    // like a row that opens a related object, the clicked element is gone by the time the drawer sees the click
    row.addEventListener("click", () => row.remove());

    fireEvent.mouseDown(row);
    fireEvent.click(row);

    expect(onClose).not.toHaveBeenCalled();
  });

  it("closes on a click outside", () => {
    const result = render(
      <>
        <div data-testid="outside">outside</div>
        <Drawer
          open
          title="Some title"
          onClose={onClose}
          usePortal={false}
        >
          <div>contents</div>
        </Drawer>
      </>,
    );
    const outside = result.getByTestId("outside");

    fireEvent.mouseDown(outside);
    fireEvent.click(outside);

    expect(onClose).toHaveBeenCalled();
  });
});
