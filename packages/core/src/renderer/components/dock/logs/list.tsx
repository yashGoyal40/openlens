/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./list.scss";

import type { ForwardedRef } from "react";
import React from "react";
import AnsiUp from "ansi_up";
import DOMPurify from "dompurify";
import debounce from "lodash/debounce";
import { action, computed, observable, makeObservable, reaction, runInAction } from "mobx";
import { disposeOnUnmount, observer } from "mobx-react";
import type { Align, ListOnScrollProps } from "react-window";
import { array, cssNames } from "@k8slens/utilities";
import type { VirtualListRef } from "../../virtual-list";
import { VirtualList } from "../../virtual-list";
import { ToBottom } from "./to-bottom";
import type { LogTabViewModel } from "../logs/logs-view-model";
import { Spinner } from "@k8slens/spinner";
import autoBindReact from "auto-bind/react";
import { detectLogLevel, getLogMessage } from "./log-level";
import { findMatchRanges } from "./log-search-matcher";

export interface LogListProps {
  model: LogTabViewModel;
}

const colorConverter = new AnsiUp();

// eslint-disable-next-line no-control-regex
const ansiEscapeCodesRegex = /\u001b\[[0-9;]*[A-Za-z]/g;

/**
 * Text used for measuring the width of a character of the (monospace) log font
 */
const charWidthMeasureText = "0".repeat(100);

/**
 * Should correlate with the styles of a wrapped `.LogRow` in list.scss
 */
const wrappedRowLayout = {
  verticalPadding: 4,
  textLineHeight: 14,
  // horizontal paddings and room for a vertical scrollbar
  horizontalSpace: 32 + 16,
  defaultCharWidth: 7,
};

export interface LogListRef {
  scrollToItem: (index: number, align: Align) => void;
}

@observer
class NonForwardedLogList extends React.Component<LogListProps & { innerRef: ForwardedRef<LogListRef> }> {
  @observable isJumpButtonVisible = false;
  @observable isLastLineVisible = true;
  @observable listWidth = 0;
  @observable charWidth = wrappedRowLayout.defaultCharWidth;

  private virtualListDiv = React.createRef<HTMLDivElement>(); // A reference for outer container in VirtualList
  private virtualListRef = React.createRef<VirtualListRef>(); // A reference for VirtualList component
  private lineHeight = 18; // Height of a log line. Should correlate with styles in pod-log-list.scss
  private resizeObserver?: ResizeObserver;

  constructor(props: any) {
    super(props);
    makeObservable(this);
    autoBindReact(this);
  }

  componentDidMount() {
    disposeOnUnmount(this, [
      reaction(() => this.logs, (logs, prevLogs) => {
        this.onLogsInitialLoad(logs, prevLogs);
        this.onLogsUpdate();
        this.onUserScrolledUp(logs, prevLogs);
      }),
    ]);
    this.bindInnerRef({
      scrollToItem: this.scrollToItem,
    });
  }

  componentDidUpdate() {
    this.bindInnerRef({
      scrollToItem: this.scrollToItem,
    });
  }

  componentWillUnmount() {
    this.bindInnerRef(null);
    this.resizeObserver?.disconnect();
  }

  private bindInnerRef(value: LogListRef | null) {
    if (typeof this.props.innerRef === "function") {
      this.props.innerRef(value);
    } else if (this.props.innerRef && typeof this.props.innerRef === "object") {
      this.props.innerRef.current = value;
    }
  }

  onLogsInitialLoad(logs: string[], prevLogs: string[]) {
    if (!prevLogs.length && logs.length) {
      this.isLastLineVisible = true;
    }
  }

  onLogsUpdate() {
    if (this.isLastLineVisible) {
      setTimeout(() => {
        this.scrollToBottom();
      }, 500);  // Giving some time to VirtualList to prepare its outerRef (this.virtualListDiv) element
    }
  }

  onUserScrolledUp(logs: string[], prevLogs: string[]) {
    if (!this.virtualListDiv.current) return;

    const newLogsAdded = prevLogs.length < logs.length;
    const scrolledToBeginning = this.virtualListDiv.current.scrollTop === 0;

    if (newLogsAdded && scrolledToBeginning) {
      const firstLineContents = prevLogs[0];
      const lineToScroll = logs.findIndex((value) => value == firstLineContents);

      if (lineToScroll !== -1) {
        this.scrollToItem(lineToScroll, "start");
      }
    }
  }

  /**
   * Returns the logs as displayed: with or without timestamps and possibly only the lines matching the search
   */
  @computed
  get logs(): string[] {
    return this.props.model.visibleLogs.get();
  }

  @computed
  get wrapLines(): boolean {
    return this.props.model.logTabData.get()?.wrapLines ?? false;
  }

  @computed
  get rowHeights(): number[] {
    const { verticalPadding, textLineHeight, horizontalSpace } = wrappedRowLayout;
    const charsPerLine = this.wrapLines
      ? Math.floor((this.listWidth - horizontalSpace) / this.charWidth)
      : 0;

    if (charsPerLine <= 0) {
      return array.filled(this.logs.length, this.lineHeight);
    }

    return this.logs.map(line => {
      const text = line.replace(ansiEscapeCodesRegex, "");
      const tabCount = text.split("\t").length - 1;
      const lineCount = Math.max(1, Math.ceil((text.length + tabCount * 7) / charsPerLine));

      return verticalPadding + lineCount * textLineHeight;
    });
  }

  /**
   * Keeps track of the width of the list, which is needed for computing the heights of wrapped lines
   */
  bindListElement(element: HTMLDivElement | null) {
    this.resizeObserver?.disconnect();
    this.resizeObserver = undefined;

    if (!element) {
      return;
    }

    const updateWidth = action(() => {
      this.listWidth = element.clientWidth;
    });

    updateWidth();

    if (typeof ResizeObserver !== "undefined") {
      this.resizeObserver = new ResizeObserver(updateWidth);
      this.resizeObserver.observe(element);
    }
  }

  measureCharWidth(element: HTMLSpanElement | null) {
    const width = (element?.getBoundingClientRect().width ?? 0) / charWidthMeasureText.length;

    if (width > 0) {
      runInAction(() => this.charWidth = width);
    }
  }

  /**
   * Checks if JumpToBottom button should be visible and sets its observable
   * @param props Scrolling props from virtual list core
   */
  setButtonVisibility = action(({ scrollOffset }: ListOnScrollProps, { scrollHeight }: HTMLDivElement) => {
    const offset = 100 * this.lineHeight;

    if (scrollHeight - scrollOffset < offset) {
      this.isJumpButtonVisible = false;
    } else {
      this.isJumpButtonVisible = true;
    }
  });

  /**
   * Checks if last log line considered visible to user, setting its observable
   * @param props Scrolling props from virtual list core
   */
  setLastLineVisibility = action(({ scrollOffset }: ListOnScrollProps, { scrollHeight, clientHeight }: HTMLDivElement) => {
    this.isLastLineVisible = (clientHeight + scrollOffset) === scrollHeight;
  });

  /**
   * Check if user scrolled to top and new logs should be loaded
   * @param props Scrolling props from virtual list core
   */
  checkLoadIntent = (props: ListOnScrollProps) => {
    const { scrollOffset } = props;

    if (scrollOffset === 0) {
      this.props.model.loadLogs();
    }
  };

  scrollToBottom = () => {
    if (!this.virtualListDiv.current) return;
    this.virtualListDiv.current.scrollTop = this.virtualListDiv.current.scrollHeight;
  };

  scrollToItem = (index: number, align: Align) => {
    this.virtualListRef.current?.scrollToItem(index, align);
  };

  onScroll = (props: ListOnScrollProps) => {
    this.isLastLineVisible = false;
    this.onScrollDebounced(props);
  };

  onScrollDebounced = debounce((props: ListOnScrollProps) => {
    const virtualList = this.virtualListDiv.current;

    if (virtualList) {
      this.setButtonVisibility(props, virtualList);
      this.setLastLineVisibility(props, virtualList);
      this.checkLoadIntent(props);
    }
  }, 700); // Increasing performance and giving some time for virtual list to settle down

  /**
   * A function is called by VirtualList for rendering each of the row
   * @param rowIndex index of the log element in logs array
   * @returns A react element with a row itself
   */
  getLogRow = (rowIndex: number) => {
    const { searchStore, searchMatcher, logTabData } = this.props.model;
    const regex = searchMatcher.get()?.regex;
    const item = this.logs[rowIndex];
    const level = detectLogLevel(getLogMessage(item, logTabData.get()?.showAllContainers));
    const contents: React.ReactElement[] = [];
    const ansiToHtml = (ansi: string) => DOMPurify.sanitize(colorConverter.ansi_to_html(ansi));

    if (regex) { // If search is enabled, wrap the matches with backgrounded <span>
      let lastIndex = 0;

      findMatchRanges(item, regex).forEach(({ start, end }, index) => {
        const active = searchStore.isActiveOverlay(rowIndex, index);

        contents.push(
          <React.Fragment key={index}>
            <span dangerouslySetInnerHTML={{ __html: ansiToHtml(item.slice(lastIndex, start)) }} />
            <span
              className={cssNames("overlay", { active })}
              dangerouslySetInnerHTML={{ __html: ansiToHtml(item.slice(start, end)) }}
            />
          </React.Fragment>,
        );
        lastIndex = end;
      });

      if (contents.length > 0) {
        contents.push(<span key="rest" dangerouslySetInnerHTML={{ __html: ansiToHtml(item.slice(lastIndex)) }} />);
      }
    }

    return (
      <div className={cssNames("LogRow", level && `level-${level}`)}>
        {contents.length > 0 ? contents : (
          <span dangerouslySetInnerHTML={{ __html: ansiToHtml(item) }} />
        )}
        {/* For preserving copy-paste experience and keeping line breaks */}
        <br />
      </div>
    );
  };

  renderNoLogs() {
    const { model } = this.props;
    const tabData = model.logTabData.get();

    if (model.displayedLogs.get().length > 0) {
      return "There are no log lines matching the search";
    }

    if (tabData?.showAllContainers) {
      return "There are no logs available for the containers of this pod";
    }

    return (
      <>
        There are no logs available for container
        {" "}
        {tabData?.selectedContainer}
      </>
    );
  }

  render() {
    if (this.props.model.isLoading.get()) {
      return (
        <div className="LogList flex box grow align-center justify-center">
          <Spinner />
        </div>
      );
    }

    if (!this.logs.length) {
      return (
        <div className="LogList flex box grow align-center justify-center">
          {this.renderNoLogs()}
        </div>
      );
    }

    return (
      <div
        className={cssNames("LogList flex", { wrapLines: this.wrapLines })}
        ref={this.bindListElement}
      >
        {this.wrapLines && (
          <span
            className="char-width-measure"
            aria-hidden="true"
            ref={this.measureCharWidth}
          >
            {charWidthMeasureText}
          </span>
        )}
        <VirtualList
          items={this.logs}
          rowHeights={this.rowHeights}
          getRow={this.getLogRow}
          onScroll={this.onScroll}
          outerRef={this.virtualListDiv}
          ref={this.virtualListRef}
          className="box grow"
        />
        {this.isJumpButtonVisible && (
          <ToBottom onClick={this.scrollToBottom} />
        )}
      </div>
    );
  }
}

export const LogList = React.forwardRef<LogListRef, LogListProps>((props, ref) => (
  <NonForwardedLogList {...props} innerRef={ref} />
));
