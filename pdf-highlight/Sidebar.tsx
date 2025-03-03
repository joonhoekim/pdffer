"use client";

import type { IHighlight } from "./index";

interface Props {
  highlights: Array<IHighlight>;
  resetHighlights: () => void;
  toggleDocument: () => void;
}

const updateHash = (highlight: IHighlight) => {
  document.location.hash = `highlight-${highlight.id}`;
};

const APP_VERSION = "1.0.0";

export function Sidebar({ highlights, toggleDocument, resetHighlights }: Props) {
  return (
    <div className="sidebar">
      <div className="description" style={{ padding: "1rem" }}>
        <p>
          <small>Alt 키 누르고 드래그 : 영역 하이라이트</small>
        </p>
      </div>

      <ul className="sidebar__highlights">
        {highlights.map((highlight, index) => (
          <li
            key={highlight.id}
            className="sidebar__highlight"
            onClick={() => {
              updateHash(highlight);
            }}>
            <div>
              <strong>{highlight.comment.text}</strong>
              {highlight.content.text ? <blockquote style={{ marginTop: "0.5rem" }}>{`${highlight.content.text.slice(0, 90).trim()}…`}</blockquote> : null}
              {highlight.content.image ? (
                <div className="highlight__image" style={{ marginTop: "0.5rem" }}>
                  <img src={highlight.content.image} alt={"Screenshot"} />
                </div>
              ) : null}
            </div>
            <div className="highlight__location">Page {highlight.position.pageNumber}</div>
          </li>
        ))}
      </ul>
      <div style={{ padding: "1rem" }}>
        <button type="button" onClick={toggleDocument}>
          Toggle PDF document
        </button>
      </div>
      {highlights.length > 0 ? (
        <div style={{ padding: "1rem" }}>
          <button type="button" onClick={resetHighlights}>
            Reset highlights
          </button>
        </div>
      ) : null}
    </div>
  );
}
