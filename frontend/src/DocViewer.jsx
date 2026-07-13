import React, { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist/build/pdf.mjs";
import { renderAsync } from "docx-preview";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.mjs",
  import.meta.url,
).toString();

// =========================================================================
// FLOATING POPOVER — positioned absolutely near the hovered/clicked highlight
// =========================================================================
function FloatingPopover({ ann, rect, containerRef }) {
  if (!ann || !rect) return null;
  const containerRect = containerRef.current?.getBoundingClientRect();
  if (!containerRect) return null;
  const top = rect.top - containerRect.top - 8;
  const left = Math.max(0, Math.min(rect.left - containerRect.left, containerRect.width - 340));
  const showAbove = top > 200;
  return (
    <div style={{
      position: "absolute", zIndex: 1000, width: 320, maxWidth: "calc(100% - 16px)",
      padding: "14px 16px", borderRadius: 12,
      background: "color-mix(in srgb, var(--card) 88%, transparent)",
      border: "1px solid color-mix(in srgb, var(--border) 70%, transparent)",
      boxShadow: "0 8px 28px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.06)",
      backdropFilter: "blur(14px)", fontSize: "0.82rem", lineHeight: 1.5,
      color: "var(--foreground)", pointerEvents: "none",
      top: showAbove ? "auto" : rect.bottom - containerRect.top + 8,
      bottom: showAbove ? containerRect.height - top : "auto",
      left,
    }}>
      {ann.severity && (
        <span style={{
          position: "absolute", top: 10, right: 12, textTransform: "uppercase",
          fontSize: "0.62rem", fontWeight: 800, padding: "2px 7px", borderRadius: 8,
          background: ann.severity === "high" ? "color-mix(in srgb, var(--rose) 25%, transparent)" : "color-mix(in srgb, var(--amber) 25%, transparent)",
          color: ann.severity === "high" ? "var(--rose)" : "var(--amber)",
        }}>{ann.severity}</span>
      )}
      {ann.issue && <strong style={{ display: "block", marginBottom: 4, paddingRight: ann.severity ? 50 : 0, fontSize: "0.85rem" }}>{ann.issue}</strong>}
      {ann.text && <div style={{ padding: "5px 8px", background: "color-mix(in srgb, var(--primary) 8%, transparent)", borderRadius: 6, marginBottom: 6, fontStyle: "italic", color: "var(--muted)" }}>"{ann.text}"</div>}
      {ann.explanation && <p style={{ margin: "0 0 8px" }}>{ann.explanation}</p>}
      {ann.suggestion && (
        <div style={{ padding: "8px 10px", background: "color-mix(in srgb, var(--emerald) 10%, transparent)", borderRadius: 8, border: "1px solid color-mix(in srgb, var(--emerald) 30%, transparent)" }}>
          <strong style={{ fontSize: "0.76rem", color: "var(--emerald)", display: "block", marginBottom: 2 }}>Suggested Remedy</strong>
          <span>{ann.suggestion}</span>
        </div>
      )}
    </div>
  );
}

// =========================================================================
// TEXT VIEWER — renders plain/pasted lesson text with highlight overlays
// =========================================================================
export function TextViewer({ text, annotations = [], activeIndex, setActiveIndex, hoveredIndex, setHoveredIndex }) {
  const containerRef = useRef(null);
  const [popover, setPopover] = useState(null);

  const str = String(text || "");
  const lowerStr = str.toLowerCase();
  const ranges = [];

  annotations.forEach((ann, annIdx) => {
    let start = Number(ann.start);
    let end = Number(ann.end);
    let found = false;

    if (Number.isFinite(start) && start >= 0 && Number.isFinite(end) && end > start && end <= str.length) {
      ranges.push({ start, end, annIdx, severity: ann.severity || "medium", title: ann.issue || "Pedagogy Note", ann });
      found = true;
    }

    if (!found && ann.text && typeof ann.text === "string" && ann.text.trim()) {
      const phrase = ann.text.trim();
      let pos = str.indexOf(phrase);
      if (pos < 0) pos = lowerStr.indexOf(phrase.toLowerCase());
      if (pos >= 0) {
        ranges.push({ start: pos, end: pos + phrase.length, annIdx, severity: ann.severity || "medium", title: ann.issue || "Pedagogy Note", ann });
      }
    }
  });

  ranges.sort((a, b) => a.start - b.start);
  const segments = [];
  let curr = 0;

  for (let i = 0; i < ranges.length; i++) {
    const r = ranges[i];
    if (r.start < curr) continue;
    if (r.start > curr) {
      segments.push({ type: "plain", text: str.slice(curr, r.start) });
    }
    segments.push({ type: "mark", text: str.slice(r.start, r.end), ...r });
    curr = r.end;
  }
  if (curr < str.length) {
    segments.push({ type: "plain", text: str.slice(curr) });
  }

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMouseEnter = (e) => {
      const mark = e.target.closest("mark[data-ann-idx]");
      if (!mark) return;
      const idx = Number(mark.dataset.annIdx);
      const ann = annotations[idx];
      if (!ann) return;
      if (setHoveredIndex) setHoveredIndex(idx);
      setPopover({ ann, rect: mark.getBoundingClientRect() });
    };

    const handleMouseLeave = (e) => {
      if (!e.target.closest("mark[data-ann-idx]")) return;
      if (setHoveredIndex) setHoveredIndex(null);
      setPopover(null);
    };

    const handleClick = (e) => {
      const mark = e.target.closest("mark[data-ann-idx]");
      if (!mark) return;
      const idx = Number(mark.dataset.annIdx);
      if (setActiveIndex) setActiveIndex(idx === activeIndex ? null : idx);
    };

    container.addEventListener("mouseover", handleMouseEnter);
    container.addEventListener("mouseout", handleMouseLeave);
    container.addEventListener("click", handleClick);
    return () => {
      container.removeEventListener("mouseover", handleMouseEnter);
      container.removeEventListener("mouseout", handleMouseLeave);
      container.removeEventListener("click", handleClick);
    };
  }, [annotations, activeIndex, setActiveIndex, setHoveredIndex]);

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%" }}>
      <div className="document-page" style={{ padding: "36px 44px" }}>
        <pre className="DV-textContents" style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", margin: 0, lineHeight: 1.8, fontSize: "0.95rem" }}>
          {segments.map((seg, i) => {
            if (seg.type === "plain") {
              return <span key={`plain-${i}`}>{seg.text}</span>;
            }
            const isActive = seg.annIdx === activeIndex;
            const isHovered = seg.annIdx === hoveredIndex;
            return (
              <mark
                key={`mark-${seg.annIdx}-${i}`}
                data-ann-idx={seg.annIdx}
                className={`highlight ${seg.severity} ${isActive ? "active" : ""} ${isHovered ? "hovered" : ""}`}
                title={seg.title}
                style={{ cursor: "pointer", transition: "all 160ms ease" }}
              >
                {seg.text}
              </mark>
            );
          })}
        </pre>
      </div>
      <FloatingPopover ann={popover?.ann} rect={popover?.rect} containerRef={containerRef} />
    </div>
  );
}

// =========================================================================
// DOCX VIEWER — renders the ORIGINAL .docx file bytes natively using
// docx-preview. Overlays <mark> highlights at annotation offsets or substrings.
// =========================================================================
export function DocxViewer({ dataUrl, annotations = [], activeIndex, setActiveIndex, hoveredIndex, setHoveredIndex, zoom = 1 }) {
  const containerRef = useRef(null);
  const innerRef = useRef(null);
  const [popover, setPopover] = useState(null);
  const [rendered, setRendered] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const inner = innerRef.current;
    if (!inner || !dataUrl) return;
    setRendered(false);
    setError("");
    inner.innerHTML = "";

    const base64 = dataUrl.split(",")[1];
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);

    renderAsync(bytes, inner, null, {
      className: "docx-render",
      inWrapper: true,
      ignoreWidth: false,
      ignoreHeight: false,
      breakPages: true,
    })
      .then(() => setRendered(true))
      .catch((err) => setError(err.message || "Failed to render DOCX"));
  }, [dataUrl]);

  useEffect(() => {
    if (!rendered) return;
    const inner = innerRef.current;
    if (!inner) return;

    const textNodes = [];
    const walker = document.createTreeWalker(inner, NodeFilter.SHOW_TEXT, null);
    let totalChars = 0;
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (!node.textContent || !node.textContent.trim()) continue;
      const len = node.textContent.length;
      textNodes.push({ node, start: totalChars, end: totalChars + len });
      totalChars += len;
    }

    const validAnns = (annotations || []).map((a, idx) => ({ ...a, origIdx: idx })).filter(
      (a) => (Number.isFinite(a.start) && a.start >= 0 && Number.isFinite(a.end) && a.end > a.start) || (a.text && typeof a.text === "string" && a.text.trim())
    );

    validAnns.sort((a, b) => (b.start || 0) - (a.start || 0));

    for (const ann of validAnns) {
      const annIdx = ann.origIdx;
      let start = Number(ann.start);
      let end = Number(ann.end);

      // If start/end invalid or not matching, find by text in DOM text nodes
      if (!Number.isFinite(start) || start < 0 || !Number.isFinite(end) || end <= start) {
        if (ann.text) {
          const phrase = ann.text.trim().toLowerCase();
          for (const entry of textNodes) {
            const nodeText = (entry.node.textContent || "").toLowerCase();
            const pos = nodeText.indexOf(phrase);
            if (pos >= 0) {
              start = entry.start + pos;
              end = start + ann.text.trim().length;
              break;
            }
          }
        }
      }

      if (!Number.isFinite(start) || start < 0 || !Number.isFinite(end) || end <= start) continue;

      const severity = ann.severity || "medium";
      const isActive = annIdx === activeIndex;
      const isHovered = annIdx === hoveredIndex;

      for (const entry of textNodes) {
        if (entry.end <= start || entry.start >= end) continue;
        const textNode = entry.node;
        const localStart = Math.max(0, start - entry.start);
        const localEnd = Math.min(entry.end, end) - entry.start;
        if (localEnd <= localStart) continue;

        try {
          const range = document.createRange();
          range.setStart(textNode, localStart);
          range.setEnd(textNode, localEnd);
          const mark = document.createElement("mark");
          mark.className = `highlight ${severity} ${isActive ? "active" : ""} ${isHovered ? "hovered" : ""}`;
          mark.dataset.annIdx = String(annIdx);
          mark.title = ann.issue || "Pedagogy Note";
          range.surroundContents(mark);
        } catch {
          // Skip range across complex tag boundary
        }
      }
    }
  }, [rendered, annotations, activeIndex, hoveredIndex]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMouseEnter = (e) => {
      const mark = e.target.closest('mark[data-ann-idx]');
      if (!mark) return;
      const idx = Number(mark.dataset.annIdx);
      const ann = annotations[idx];
      if (!ann) return;
      if (setHoveredIndex) setHoveredIndex(idx);
      setPopover({ ann, rect: mark.getBoundingClientRect() });
    };
    const handleMouseLeave = (e) => {
      if (!e.target.closest('mark[data-ann-idx]')) return;
      if (setHoveredIndex) setHoveredIndex(null);
      setPopover(null);
    };
    const handleClick = (e) => {
      const mark = e.target.closest('mark[data-ann-idx]');
      if (!mark) return;
      const idx = Number(mark.dataset.annIdx);
      if (setActiveIndex) setActiveIndex(idx === activeIndex ? null : idx);
    };

    container.addEventListener("mouseover", handleMouseEnter);
    container.addEventListener("mouseout", handleMouseLeave);
    container.addEventListener("click", handleClick);
    return () => {
      container.removeEventListener("mouseover", handleMouseEnter);
      container.removeEventListener("mouseout", handleMouseLeave);
      container.removeEventListener("click", handleClick);
    };
  }, [annotations, activeIndex, setActiveIndex, setHoveredIndex]);

  if (error) {
    return <div style={{ textAlign: "center", padding: 40, color: "var(--muted)" }}><p>Could not render document: {error}</p></div>;
  }

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%" }}>
      <div ref={innerRef} className="docx-container" style={{ transform: `scale(${zoom})`, transformOrigin: "top center" }} />
      <FloatingPopover ann={popover?.ann} rect={popover?.rect} containerRef={containerRef} />
    </div>
  );
}

// =========================================================================
// PDF VIEWER — renders actual PDF pages as canvas + text-layer highlights
// =========================================================================
export function PdfViewer({ dataUrl, annotations = [], activeIndex, setActiveIndex, hoveredIndex, setHoveredIndex }) {
  const containerRef = useRef(null);
  const [popover, setPopover] = useState(null);
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    (async () => {
      try {
        const base64 = dataUrl.split(",")[1];
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
        const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
        const renderedPages = [];
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          if (cancelled) return;
          const page = await pdf.getPage(pageNum);
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          await page.render({ canvasContext: ctx, viewport }).promise;
          const textContent = await page.getTextContent();
          const textItems = textContent.items.map((item) => ({ str: item.str, transform: item.transform, width: item.width, height: item.height }));
          let fullText = "";
          const charPositions = [];
          textItems.forEach((item, itemIdx) => {
            const start = fullText.length;
            fullText += item.str;
            charPositions.push({ start, end: start + item.str.length, itemIdx });
          });
          renderedPages.push({ pageNum, canvas, viewport, textItems, charPositions, fullText });
        }
        if (!cancelled) { setPages(renderedPages); setLoading(false); }
      } catch (err) {
        if (!cancelled) { setError(err.message || "Failed to render PDF"); setLoading(false); }
      }
    })();
    return () => { cancelled = true; };
  }, [dataUrl]);

  const renderPageHighlights = (page) => {
    const { viewport, charPositions, textItems, fullText } = page;
    if (!annotations || !annotations.length) return null;
    return annotations.map((ann, annIdx) => {
      let start = ann.start;
      let end = ann.end;
      if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0) {
        if (ann.text) {
          const pos = fullText.toLowerCase().indexOf(ann.text.toLowerCase());
          if (pos >= 0) {
            start = pos;
            end = pos + ann.text.length;
          }
        }
      }
      if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0) return null;

      const overlappingItems = [];
      charPositions.forEach((cp) => {
        if (cp.end <= start || cp.start >= end) return;
        const itemStart = Math.max(0, start - cp.start);
        const itemEnd = Math.min(cp.end, end) - cp.start;
        overlappingItems.push({ ...cp, charStart: itemStart, charEnd: itemEnd });
      });
      if (!overlappingItems.length) return null;
      const isActive = annIdx === activeIndex;
      const isHovered = annIdx === hoveredIndex;
      return overlappingItems.map((oi, i) => {
        const item = textItems[oi.itemIdx];
        if (!item || !item.transform) return null;
        const tx = pdfjsLib.Util.transform(viewport.transform, item.transform);
        const x = tx[4];
        const y = viewport.height - tx[5];
        const fontHeight = Math.hypot(tx[2], tx[3]);
        const ratio = (oi.charEnd - oi.charStart) / (item.str.length || 1);
        const width = item.width * viewport.scale * ratio;
        return (
          <div key={`hl-${annIdx}-${i}`} className={`pdf-highlight ${ann.severity || "medium"} ${isActive ? "active" : ""} ${isHovered ? "hovered" : ""}`} data-ann-idx={annIdx}
            style={{ position: "absolute", left: x, top: y - fontHeight, width: Math.max(width, 8), height: fontHeight, pointerEvents: "auto", cursor: "pointer" }} />
        );
      });
    });
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handleMouseEnter = (e) => {
      const hl = e.target.closest(".pdf-highlight[data-ann-idx]");
      if (!hl) return;
      const idx = Number(hl.dataset.annIdx);
      const ann = annotations[idx];
      if (!ann) return;
      if (setHoveredIndex) setHoveredIndex(idx);
      setPopover({ ann, rect: hl.getBoundingClientRect() });
    };
    const handleMouseLeave = () => {
      if (setHoveredIndex) setHoveredIndex(null);
      setPopover(null);
    };
    const handleClick = (e) => {
      const hl = e.target.closest(".pdf-highlight[data-ann-idx]");
      if (!hl) return;
      const idx = Number(hl.dataset.annIdx);
      if (setActiveIndex) setActiveIndex(idx === activeIndex ? null : idx);
    };
    container.addEventListener("mouseover", handleMouseEnter);
    container.addEventListener("mouseout", handleMouseLeave);
    container.addEventListener("click", handleClick);
    return () => {
      container.removeEventListener("mouseover", handleMouseEnter);
      container.removeEventListener("mouseout", handleMouseLeave);
      container.removeEventListener("click", handleClick);
    };
  }, [annotations, activeIndex, setActiveIndex, setHoveredIndex]);

  if (loading) return <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 300, color: "var(--muted)" }}>Rendering PDF…</div>;
  if (error) return <div style={{ textAlign: "center", padding: 40, color: "var(--muted)" }}><p>Could not render PDF: {error}</p></div>;

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%", maxWidth: 800, margin: "0 auto" }}>
      {pages.map((page) => (
        <div key={page.pageNum} style={{ position: "relative", marginBottom: 12 }}>
          <canvas ref={(el) => { if (el && page.canvas) { const ctx = el.getContext("2d"); el.width = page.canvas.width; el.height = page.canvas.height; ctx.drawImage(page.canvas, 0, 0); } }} style={{ width: "100%", height: "auto", display: "block", boxShadow: "0 1px 4px rgba(0,0,0,0.08), 0 8px 32px rgba(0,0,0,0.06)", borderRadius: 2 }} />
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, pointerEvents: "none" }}>{renderPageHighlights(page)}</div>
          <div style={{ textAlign: "center", fontSize: "0.72rem", color: "var(--muted)", marginTop: 2 }}>Page {page.pageNum}</div>
        </div>
      ))}
      <FloatingPopover ann={popover?.ann} rect={popover?.rect} containerRef={containerRef} />
    </div>
  );
}

