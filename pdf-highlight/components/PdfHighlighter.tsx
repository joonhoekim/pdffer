"use client";

import type { PDFDocumentProxy } from "pdfjs-dist";
import type { EventBus, PDFViewer } from "pdfjs-dist/legacy/web/pdf_viewer.mjs";
import type { PDFViewerOptions } from "pdfjs-dist/types/web/pdf_viewer";
import React, { type PointerEventHandler, PureComponent, type RefObject } from "react";
import { type Root, createRoot } from "react-dom/client";
import { debounce } from "ts-debounce";
import { scaledToViewport, viewportToScaled } from "../lib/coordinates";
import { getAreaAsPNG } from "../lib/get-area-as-png";
import { getBoundingRect } from "../lib/get-bounding-rect";
import { getClientRects } from "../lib/get-client-rects";
import { findOrCreateContainerLayer, getPageFromElement, getPagesFromRange, getWindow, isHTMLElement } from "../lib/pdfjs-dom";
import styles from "../style/PdfHighlighter.module.css";
import type { IHighlight, LTWH, LTWHP, Position, Scaled, ScaledPosition } from "../types";
import { HighlightLayer } from "./HighlightLayer";
import { MouseSelection } from "./MouseSelection";
import { TipContainer } from "./TipContainer";

// (인터섹션 타입) 제네릭으로 받는 T_HT라는 타입에 position을 추가하라는 의미
// T_HT는 IHighlight를 확장한 타입으로, 사용자가 정의한 하이라이트 타입
export type T_ViewportHighlight<T_HT> = { position: Position } & T_HT;

// (인터페이스) State 라는 인터페이스를 정의하는데, 다른 변수 타입을 하나 받아서 highlight 타입을 정의함
// ghostHighlight: 현재 선택 중인 임시 하이라이트
// isCollapsed: 텍스트 선택이 접혀있는지 여부
// range: 현재 선택된 텍스트 범위
// tip: 하이라이트에 표시되는 팁 정보
// tipPosition: 팁의 위치
// tipChildren: 팁의 내용
// isAreaSelectionInProgress: 영역 선택 진행 중 여부
// scrolledToHighlightId: 현재 스크롤된 하이라이트의 ID
interface State<T_HT> {
  ghostHighlight: {
    position: ScaledPosition;
    content?: { text?: string; image?: string };
  } | null;
  isCollapsed: boolean;
  range: Range | null;
  tip: {
    highlight: T_ViewportHighlight<T_HT>;
    callback: (highlight: T_ViewportHighlight<T_HT>) => JSX.Element;
  } | null;
  tipPosition: Position | null;
  tipChildren: JSX.Element | null;
  isAreaSelectionInProgress: boolean;
  scrolledToHighlightId: string;
}

// (인터페이스) 프롭스는 제네릭 타입 변수로 T_HT를 받음. 매우 복잡함. pdfjs 라이브러리와 결합도 높음.
// highlightTransform: 하이라이트의 시각적 표현을 변환하는 함수
// highlights: 현재 표시된 하이라이트들의 배열
// onScrollChange: 스크롤 변경 시 호출되는 콜백
// scrollRef: 특정 하이라이트로 스크롤하기 위한 함수 참조
// pdfDocument: PDF.js의 문서 객체
// pdfScaleValue: PDF 확대/축소 값
// onSelectionFinished: 선택 완료 시 호출되는 콜백
// enableAreaSelection: 영역 선택 활성화 여부를 결정하는 함수
// pdfViewerOptions: PDF.js 뷰어 옵션
interface Props<T_HT> {
  highlightTransform: (
    highlight: T_ViewportHighlight<T_HT>,
    index: number,
    setTip: (highlight: T_ViewportHighlight<T_HT>, callback: (highlight: T_ViewportHighlight<T_HT>) => JSX.Element) => void,
    hideTip: () => void,
    viewportToScaled: (rect: LTWHP) => Scaled,
    screenshot: (position: LTWH) => string,
    isScrolledTo: boolean,
  ) => JSX.Element;
  highlights: Array<T_HT>;
  onScrollChange: () => void;
  scrollRef: (scrollTo: (highlight: T_HT) => void) => void;
  pdfDocument: PDFDocumentProxy;
  pdfScaleValue: string;
  onSelectionFinished: (position: ScaledPosition, content: { text?: string; image?: string }, hideTipAndSelection: () => void, transformSelection: () => void) => JSX.Element | null;
  enableAreaSelection: (event: MouseEvent) => boolean;
  pdfViewerOptions?: PDFViewerOptions;
}

// (상수) 빈 아이디
const EMPTY_ID = "empty-id";

// 여기서부터가 핵심임. 클래스로 정의했는데, 이거 함수형으로 바꿔보니까 성능이 너무 안좋아짐.
// 상태 변경될 때마다 매번 복사하고, 함수에 전파하다보니 8코어 시스템에서 20%는 계속 먹고 있음.
// 그래서 이거 변경 안할거임. 여기는 객체지향으로 설계한 게 너무 잘한 것이었음. 이거 만든 사람 대단함.
export class PdfHighlighter<T_HT extends IHighlight> extends PureComponent<Props<T_HT>, State<T_HT>> {
  // 기본 설정임. 전달되는 값은 pdfjs의 API를 따름.
  static defaultProps = {
    pdfScaleValue: "auto",
  };

  // 클래스 변수인데, 기본값으로 아래와 같이 설정됨.
  state: State<T_HT> = {
    ghostHighlight: null,
    isCollapsed: true,
    range: null,
    scrolledToHighlightId: EMPTY_ID,
    isAreaSelectionInProgress: false,
    tip: null,
    tipPosition: null,
    tipChildren: null,
  };

  // PDF 뷰어 객체 - PDF.js의 PDFViewer 인스턴스를 저장
  // 문서 렌더링, 확대/축소, 스크롤 등의 기능을 제공
  viewer!: PDFViewer;

  // ResizeObserver - 컨테이너 크기 변경을 감지하여 PDF 스케일을 조정
  // PDF 뷰어의 반응형 동작을 위해 사용됨
  resizeObserver: ResizeObserver | null = null;

  // PDF 뷰어를 포함하는 컨테이너 div 요소
  // 실제 DOM 요소에 대한 참조를 저장
  containerNode?: HTMLDivElement | null = null;

  // 컨테이너 div에 대한 React ref
  // React의 가상 DOM과 실제 DOM을 연결하는 역할
  containerNodeRef: RefObject<HTMLDivElement>;

  // 페이지별 하이라이트 레이어의 React root와 컨테이너 요소를 관리
  // 각 PDF 페이지마다 별도의 하이라이트 레이어를 생성하고 관리
  highlightRoots: {
    [page: number]: { reactRoot: Root; container: Element };
  } = {};

  // 이벤트 리스너 해제를 위한 cleanup 함수
  // componentWillUnmount에서 호출되어 메모리 누수 방지
  unsubscribe = () => {};

  // 컴포넌트 생성자
  // ResizeObserver 초기화 및 컨테이너 ref 생성
  constructor(props: Props<T_HT>) {
    super(props);
    if (typeof ResizeObserver !== "undefined") {
      this.resizeObserver = new ResizeObserver(this.debouncedScaleValue);
    }
    this.containerNodeRef = React.createRef();
  }

  // 컴포넌트 마운트 시 초기화 수행
  componentDidMount() {
    this.init();
  }

  // PDF 뷰어에 이벤트 리스너 연결
  // textlayerrendered: PDF 텍스트 레이어 렌더링 완료 시 발생
  // pagesinit: PDF 페이지 초기화 완료 시 발생
  // selectionchange: 텍스트 선택 변경 시 발생
  // keydown: 키보드 입력 시 발생
  // resize: 창 크기 변경 시 발생
  attachRef = (eventBus: EventBus) => {
    const { resizeObserver: observer } = this;
    this.containerNode = this.containerNodeRef.current;
    this.unsubscribe();

    if (this.containerNode) {
      const { ownerDocument: doc } = this.containerNode;
      eventBus.on("textlayerrendered", this.onTextLayerRendered);
      eventBus.on("pagesinit", this.onDocumentReady);
      doc.addEventListener("selectionchange", this.onSelectionChange);
      doc.addEventListener("keydown", this.handleKeyDown);
      doc.defaultView?.addEventListener("resize", this.debouncedScaleValue);
      if (observer) observer.observe(this.containerNode);

      this.unsubscribe = () => {
        eventBus.off("pagesinit", this.onDocumentReady);
        eventBus.off("textlayerrendered", this.onTextLayerRendered);
        doc.removeEventListener("selectionchange", this.onSelectionChange);
        doc.removeEventListener("keydown", this.handleKeyDown);
        doc.defaultView?.removeEventListener("resize", this.debouncedScaleValue);
        if (observer) observer.disconnect();
      };
    }
  };

  // 컴포넌트 업데이트 시 호출
  // PDF 문서나 하이라이트가 변경된 경우 적절한 처리 수행
  componentDidUpdate(prevProps: Props<T_HT>) {
    if (prevProps.pdfDocument !== this.props.pdfDocument) {
      this.init();
      return;
    }
    if (prevProps.highlights !== this.props.highlights) {
      this.renderHighlightLayers();
    }
  }

  // PDF 뷰어 초기화
  // PDF.js 라이브러리 로드 및 뷰어 설정
  // 이벤트 버스와 링크 서비스 설정
  async init() {
    const { pdfDocument, pdfViewerOptions } = this.props;
    const pdfjs = await import("pdfjs-dist/web/pdf_viewer.mjs");

    const eventBus = new pdfjs.EventBus();
    const linkService = new pdfjs.PDFLinkService({
      eventBus,
      externalLinkTarget: 2,
    });

    if (!this.containerNodeRef.current) {
      throw new Error("!");
    }

    this.viewer =
      this.viewer ||
      new pdfjs.PDFViewer({
        container: this.containerNodeRef.current,
        eventBus: eventBus,
        // enhanceTextSelection: true, // deprecated. https://github.com/mozilla/pdf.js/issues/9943#issuecomment-409369485
        textLayerMode: 2,
        removePageBorders: true,
        linkService: linkService,
        ...pdfViewerOptions,
      });

    linkService.setDocument(pdfDocument);
    linkService.setViewer(this.viewer);
    this.viewer.setDocument(pdfDocument);

    this.attachRef(eventBus);
  }

  // 컴포넌트 언마운트 시 cleanup 수행
  componentWillUnmount() {
    this.unsubscribe();
  }

  // 특정 페이지의 하이라이트 레이어를 찾거나 생성
  // PDF 페이지의 텍스트 레이어 위에 하이라이트를 표시하기 위한 컨테이너 레이어 관리
  findOrCreateHighlightLayer(page: number) {
    const { textLayer } = this.viewer.getPageView(page - 1) || {};

    if (!textLayer) {
      return null;
    }

    return findOrCreateContainerLayer(textLayer.div, `PdfHighlighter__highlight-layer ${styles.highlightLayer}`, ".PdfHighlighter__highlight-layer");
  }

  // 하이라이트를 페이지별로 그룹화
  // 각 하이라이트가 속한 페이지를 기준으로 정리
  // 페이지를 걸쳐있는 하이라이트의 경우 각 페이지에 적절히 분배
  groupHighlightsByPage(highlights: Array<T_HT>): {
    [pageNumber: string]: Array<T_HT>;
  } {
    const { ghostHighlight } = this.state;

    const allHighlights = [...highlights, ghostHighlight].filter(Boolean) as T_HT[];

    const pageNumbers = new Set<number>();
    for (const highlight of allHighlights) {
      pageNumbers.add(highlight.position.pageNumber);
      for (const rect of highlight.position.rects) {
        if (rect.pageNumber) {
          pageNumbers.add(rect.pageNumber);
        }
      }
    }

    const groupedHighlights: Record<number, T_HT[]> = {};

    for (const pageNumber of pageNumbers) {
      groupedHighlights[pageNumber] = groupedHighlights[pageNumber] || [];
      for (const highlight of allHighlights) {
        const pageSpecificHighlight = {
          ...highlight,
          position: {
            pageNumber,
            boundingRect: highlight.position.boundingRect,
            rects: [],
            usePdfCoordinates: highlight.position.usePdfCoordinates,
          } as ScaledPosition,
        };
        let anyRectsOnPage = false;
        for (const rect of highlight.position.rects) {
          if (pageNumber === (rect.pageNumber || highlight.position.pageNumber)) {
            pageSpecificHighlight.position.rects.push(rect);
            anyRectsOnPage = true;
          }
        }
        if (anyRectsOnPage || pageNumber === highlight.position.pageNumber) {
          groupedHighlights[pageNumber].push(pageSpecificHighlight);
        }
      }
    }

    return groupedHighlights;
  }

  // 하이라이트에 대한 팁(툴팁) 표시
  // 현재 선택 또는 영역 선택 중이 아닐 때만 팁 표시
  showTip(highlight: T_ViewportHighlight<T_HT>, content: JSX.Element) {
    const { isCollapsed, ghostHighlight, isAreaSelectionInProgress } = this.state;

    const highlightInProgress = !isCollapsed || ghostHighlight;

    if (highlightInProgress || isAreaSelectionInProgress) {
      return;
    }

    this.setTip(highlight.position, content);
  }

  // PDF 좌표계의 위치를 뷰포트 좌표계로 변환
  // PDF의 실제 크기 기준 좌표를 화면에 표시되는 크기 기준으로 변환
  scaledPositionToViewport({ pageNumber, boundingRect, rects, usePdfCoordinates }: ScaledPosition): Position {
    const viewport = this.viewer.getPageView(pageNumber - 1).viewport;

    return {
      boundingRect: scaledToViewport(boundingRect, viewport, usePdfCoordinates),
      rects: (rects || []).map((rect) => scaledToViewport(rect, viewport, usePdfCoordinates)),
      pageNumber,
    };
  }

  // 뷰포트 좌표계의 위치를 PDF 좌표계로 변환
  // 화면에 표시되는 크기 기준 좌표를 PDF의 실제 크기 기준으로 변환
  viewportPositionToScaled({ pageNumber, boundingRect, rects }: Position): ScaledPosition {
    const viewport = this.viewer.getPageView(pageNumber - 1).viewport;

    return {
      boundingRect: viewportToScaled(boundingRect, viewport),
      rects: (rects || []).map((rect) => viewportToScaled(rect, viewport)),
      pageNumber,
    };
  }

  // 지정된 영역의 스크린샷을 PNG 형식으로 생성
  // 하이라이트 영역의 이미지를 캡처할 때 사용
  screenshot(position: LTWH, pageNumber: number) {
    const canvas = this.viewer.getPageView(pageNumber - 1).canvas;

    return getAreaAsPNG(canvas, position);
  }

  // 팁과 선택 영역을 숨김
  // 상태를 초기화하고 하이라이트 레이어를 다시 렌더링
  hideTipAndSelection = () => {
    this.setState({
      tipPosition: null,
      tipChildren: null,
    });

    this.setState({ ghostHighlight: null, tip: null }, () => this.renderHighlightLayers());
  };

  // 팁의 위치와 내용을 설정
  setTip(position: Position, inner: JSX.Element | null) {
    this.setState({
      tipPosition: position,
      tipChildren: inner,
    });
  }

  // 팁 컴포넌트를 렌더링
  // 팁의 위치를 계산하고 TipContainer 컴포넌트를 반환
  renderTip = () => {
    const { tipPosition, tipChildren } = this.state;
    if (!tipPosition) return null;

    const { boundingRect, pageNumber } = tipPosition;
    const page = {
      node: this.viewer.getPageView((boundingRect.pageNumber || pageNumber) - 1).div,
      pageNumber: boundingRect.pageNumber || pageNumber,
    };

    const pageBoundingClientRect = page.node.getBoundingClientRect();

    const pageBoundingRect = {
      bottom: pageBoundingClientRect.bottom,
      height: pageBoundingClientRect.height,
      left: pageBoundingClientRect.left,
      right: pageBoundingClientRect.right,
      top: pageBoundingClientRect.top,
      width: pageBoundingClientRect.width,
      x: pageBoundingClientRect.x,
      y: pageBoundingClientRect.y,
      pageNumber: page.pageNumber,
    };

    return (
      <TipContainer
        scrollTop={this.viewer.container.scrollTop}
        pageBoundingRect={pageBoundingRect}
        style={{
          left: page.node.offsetLeft + boundingRect.left + boundingRect.width / 2,
          top: boundingRect.top + page.node.offsetTop,
          bottom: boundingRect.top + page.node.offsetTop + boundingRect.height,
        }}>
        {tipChildren}
      </TipContainer>
    );
  };

  // 텍스트 레이어 렌더링 완료 시 호출
  // 하이라이트 레이어를 다시 렌더링
  onTextLayerRendered = () => {
    this.renderHighlightLayers();
  };

  // 특정 하이라이트로 스크롤
  // 지정된 하이라이트가 있는 페이지로 뷰어를 스크롤
  scrollTo = (highlight: T_HT) => {
    const { pageNumber, boundingRect, usePdfCoordinates } = highlight.position;

    this.viewer.container.removeEventListener("scroll", this.onScroll);

    const pageViewport = this.viewer.getPageView(pageNumber - 1).viewport;

    const scrollMargin = 10;

    this.viewer.scrollPageIntoView({
      pageNumber,
      destArray: [null, { name: "XYZ" }, ...pageViewport.convertToPdfPoint(0, scaledToViewport(boundingRect, pageViewport, usePdfCoordinates).top - scrollMargin), 0],
    });

    this.setState(
      {
        scrolledToHighlightId: highlight.id,
      },
      () => this.renderHighlightLayers(),
    );

    // wait for scrolling to finish
    setTimeout(() => {
      this.viewer.container.addEventListener("scroll", this.onScroll);
    }, 100);
  };

  // PDF 문서 로드 완료 시 호출
  // 스케일 값을 설정하고 스크롤 참조를 등록
  onDocumentReady = () => {
    const { scrollRef } = this.props;

    this.handleScaleValue();

    scrollRef(this.scrollTo);
  };

  // 텍스트 선택 변경 시 호출
  // 선택된 텍스트 범위를 상태에 저장하고 필요한 처리 수행
  onSelectionChange = () => {
    const container = this.containerNode;
    if (!container) {
      return;
    }

    const selection = getWindow(container).getSelection();
    if (!selection) {
      return;
    }

    const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;

    if (selection.isCollapsed) {
      this.setState({ isCollapsed: true });
      return;
    }

    if (!range || !container || !container.contains(range.commonAncestorContainer)) {
      return;
    }

    this.setState({
      isCollapsed: false,
      range,
    });

    this.debouncedAfterSelection();
  };

  // 스크롤 이벤트 핸들러
  // 스크롤 변경을 처리하고 하이라이트 레이어를 업데이트
  onScroll = () => {
    const { onScrollChange } = this.props;

    onScrollChange();

    this.setState(
      {
        scrolledToHighlightId: EMPTY_ID,
      },
      () => this.renderHighlightLayers(),
    );

    this.viewer.container.removeEventListener("scroll", this.onScroll);
  };

  // 마우스 다운 이벤트 핸들러
  // 팁 컨테이너 외부 클릭 시 팁과 선택 영역을 숨김
  onMouseDown: PointerEventHandler = (event) => {
    if (!(event.target instanceof Element) || !isHTMLElement(event.target)) {
      return;
    }

    if (event.target.closest("#PdfHighlighter__tip-container")) {
      return;
    }

    this.hideTipAndSelection();
  };

  // 키보드 이벤트 핸들러
  // ESC 키 입력 시 팁과 선택 영역을 숨김
  handleKeyDown = (event: KeyboardEvent) => {
    if (event.code === "Escape") {
      this.hideTipAndSelection();
    }
  };

  // 텍스트 선택 완료 후 처리
  // 선택된 텍스트에 대한 하이라이트 생성 준비
  afterSelection = () => {
    const { onSelectionFinished } = this.props;

    const { isCollapsed, range } = this.state;

    if (!range || isCollapsed) {
      return;
    }

    const pages = getPagesFromRange(range);

    if (!pages || pages.length === 0) {
      return;
    }

    const rects = getClientRects(range, pages);

    if (rects.length === 0) {
      return;
    }

    const boundingRect = getBoundingRect(rects);

    const viewportPosition: Position = {
      boundingRect,
      rects,
      pageNumber: pages[0].number,
    };

    const content = {
      text: range.toString(),
    };
    const scaledPosition = this.viewportPositionToScaled(viewportPosition);

    this.setTip(
      viewportPosition,
      onSelectionFinished(
        scaledPosition,
        content,
        () => this.hideTipAndSelection(),
        () =>
          this.setState(
            {
              ghostHighlight: { position: scaledPosition },
            },
            () => this.renderHighlightLayers(),
          ),
      ),
    );
  };

  // 텍스트 선택 처리를 디바운스 처리
  // 연속적인 선택 변경을 최적화하기 위해 500ms 딜레이 적용
  debouncedAfterSelection: () => void = debounce(this.afterSelection, 500);

  // 텍스트 선택 가능/불가능 상태 토글
  // 영역 선택 시 텍스트 선택을 비활성화하기 위해 사용
  toggleTextSelection(flag: boolean) {
    if (!this.viewer.viewer) {
      return;
    }
    this.viewer.viewer.classList.toggle(styles.disableSelection, flag);
  }

  // PDF 뷰어의 스케일 값 설정
  // props로 전달된 pdfScaleValue를 적용
  handleScaleValue = () => {
    if (this.viewer) {
      this.viewer.currentScaleValue = this.props.pdfScaleValue; //"page-width";
    }
  };

  // 스케일 값 변경을 디바운스 처리
  // 연속적인 크기 조정을 최적화하기 위해 500ms 딜레이 적용
  debouncedScaleValue: () => void = debounce(this.handleScaleValue, 500);

  render() {
    const { onSelectionFinished, enableAreaSelection } = this.props;

    return (
      <div onPointerDown={this.onMouseDown}>
        <div ref={this.containerNodeRef} className={styles.container} onContextMenu={(e) => e.preventDefault()}>
          <div className="pdfViewer" />
          {this.renderTip()}
          {typeof enableAreaSelection === "function" ? (
            <MouseSelection
              onDragStart={() => this.toggleTextSelection(true)}
              onDragEnd={() => this.toggleTextSelection(false)}
              onChange={(isVisible) => this.setState({ isAreaSelectionInProgress: isVisible })}
              shouldStart={(event) => enableAreaSelection(event) && event.target instanceof Element && isHTMLElement(event.target) && Boolean(event.target.closest(".page"))}
              onSelection={(startTarget, boundingRect, resetSelection) => {
                const page = getPageFromElement(startTarget);

                if (!page) {
                  return;
                }

                const pageBoundingRect = {
                  ...boundingRect,
                  top: boundingRect.top - page.node.offsetTop,
                  left: boundingRect.left - page.node.offsetLeft,
                  pageNumber: page.number,
                };

                const viewportPosition = {
                  boundingRect: pageBoundingRect,
                  rects: [],
                  pageNumber: page.number,
                };

                const scaledPosition = this.viewportPositionToScaled(viewportPosition);

                const image = this.screenshot(pageBoundingRect, pageBoundingRect.pageNumber);

                this.setTip(
                  viewportPosition,
                  onSelectionFinished(
                    scaledPosition,
                    { image },
                    () => this.hideTipAndSelection(),
                    () => {
                      console.log("setting ghost highlight", scaledPosition);
                      this.setState(
                        {
                          ghostHighlight: {
                            position: scaledPosition,
                            content: { image },
                          },
                        },
                        () => {
                          resetSelection();
                          this.renderHighlightLayers();
                        },
                      );
                    },
                  ),
                );
              }}
            />
          ) : null}
        </div>
      </div>
    );
  }

  // 모든 페이지의 하이라이트 레이어 렌더링
  // PDF 문서의 각 페이지마다 하이라이트 레이어를 생성하고 업데이트
  private renderHighlightLayers() {
    const { pdfDocument } = this.props;
    for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber++) {
      const highlightRoot = this.highlightRoots[pageNumber];
      /** Need to check if container is still attached to the DOM as PDF.js can unload pages. */
      if (highlightRoot?.container.isConnected) {
        this.renderHighlightLayer(highlightRoot.reactRoot, pageNumber);
      } else {
        const highlightLayer = this.findOrCreateHighlightLayer(pageNumber);
        if (highlightLayer) {
          // Check if we already have a root for this layer in a different page
          let existingRoot = false;
          for (const [, root] of Object.entries(this.highlightRoots)) {
            if (root.container === highlightLayer) {
              // Use the existing root instead of creating a new one
              this.highlightRoots[pageNumber] = root;
              this.renderHighlightLayer(root.reactRoot, pageNumber);
              existingRoot = true;
              break;
            }
          }

          // Only create a new root if we didn't find an existing one
          if (!existingRoot) {
            const reactRoot = createRoot(highlightLayer);
            this.highlightRoots[pageNumber] = {
              reactRoot,
              container: highlightLayer,
            };
            this.renderHighlightLayer(reactRoot, pageNumber);
          }
        }
      }
    }
  }

  // 특정 페이지의 하이라이트 레이어 렌더링
  // HighlightLayer 컴포넌트를 사용하여 하이라이트를 시각화
  private renderHighlightLayer(root: Root, pageNumber: number) {
    const { highlightTransform, highlights } = this.props;
    const { tip, scrolledToHighlightId } = this.state;
    root.render(
      <HighlightLayer
        highlightsByPage={this.groupHighlightsByPage(highlights)}
        pageNumber={pageNumber.toString()}
        scrolledToHighlightId={scrolledToHighlightId}
        highlightTransform={highlightTransform}
        tip={tip}
        scaledPositionToViewport={this.scaledPositionToViewport.bind(this)}
        hideTipAndSelection={this.hideTipAndSelection.bind(this)}
        viewer={this.viewer}
        screenshot={this.screenshot.bind(this)}
        showTip={this.showTip.bind(this)}
        setTip={(tip) => {
          this.setState({ tip });
        }}
      />,
    );
  }
}
