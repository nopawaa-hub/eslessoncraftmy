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
function FloatingPopover({ ann, rect, containerRef, onClose }) {
  if (!ann || !rect) return null;
  const containerRect = containerRef.current?.getBoundingClientRect();
  if (!containerRect) return null;
  const top = rect.top - containerRect.top - 8;
  const left = Math.max(0, Math.min(rect.left - containerRect.left, containerRect.width - 340));
  const showAbove = top > 210;
  return (
    <div style={{
      position: "absolute", zIndex: 1000, width: 320, maxWidth: "calc(100% - 16px)",
      padding: "14px 16px", borderRadius: 12,
      background: "color-mix(in srgb, var(--card) 94%, transparent)",
      border: "1px solid color-mix(in srgb, var(--border) 85%, transparent)",
      boxShadow: "0 12px 36px rgba(0,0,0,0.18), 0 2px 10px rgba(0,0,0,0.08)",
      backdropFilter: "blur(16px)", fontSize: "0.82rem", lineHeight: 1.5,
      color: "var(--foreground)", pointerEvents: "auto",
      top: showAbove ? "auto" : rect.bottom - containerRect.top + 8,
      bottom: showAbove ? containerRect.height - top : "auto",
      left,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6, gap: 8 }}>
        <strong style={{ fontSize: "0.86rem", color: "var(--foreground)", flex: 1 }}>{ann.issue || "Pedagogy Note"}</strong>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          {ann.severity && (
            <span style={{
              textTransform: "uppercase", fontSize: "0.62rem", fontWeight: 800, padding: "2px 7px", borderRadius: 8,
              background: ann.severity === "high" ? "color-mix(in srgb, var(--rose) 25%, transparent)" : "color-mix(in srgb, var(--amber) 25%, transparent)",
              color: ann.severity === "high" ? "var(--rose)" : "var(--amber)",
            }}>{ann.severity}</span>
          )}
          {onClose && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onClose(); }}
              style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--muted)", fontSize: "1.1rem", padding: "0 4px", lineHeight: 1 }}
            >
              ×
            </button>
          )}
        </div>
      </div>
      {ann.text && <div style={{ padding: "5px 8px", background: "color-mix(in srgb, var(--primary) 8%, transparent)", borderRadius: 6, marginBottom: 8, fontStyle: "italic", color: "var(--muted)" }}>"{ann.text}"</div>}
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

function useSyncPopover(containerRef, annotations, activeIndex, hoveredIndex, setPopover) {
  useEffect(() => {
    if (containerRef.current) {
      const marks = containerRef.current.querySelectorAll("mark[data-ann-idx], .pdf-highlight[data-ann-idx]");
      marks.forEach((m) => {
        const idx = Number(m.dataset.annIdx);
        m.classList.toggle("active", idx === activeIndex);
        m.classList.toggle("hovered", idx === hoveredIndex);
      });
    }

    const activeIdx = hoveredIndex !== null && hoveredIndex !== undefined ? hoveredIndex : activeIndex;
    if (activeIdx !== null && activeIdx !== undefined && annotations[activeIdx]) {
      const mark = containerRef.current?.querySelector(`mark[data-ann-idx="${activeIdx}"], .pdf-highlight[data-ann-idx="${activeIdx}"]`);
      if (mark) {
        setPopover({ ann: annotations[activeIdx], rect: mark.getBoundingClientRect() });
        return;
      }
    }
    if (activeIndex === null || activeIndex === undefined) {
      setPopover(null);
    }
  }, [activeIndex, hoveredIndex, annotations, setPopover]);
}

// =========================================================================
// TEXT VIEWER — renders plain/pasted lesson text with highlight overlays
// =========================================================================
function splitSegmentsIntoPages(segments) {
  if (!segments || !segments.length) return [[]];
  const pages = [];
  let currentPage = [];
  let charCount = 0;

  for (const seg of segments) {
    if (seg.type === "plain" && (charCount + seg.text.length > 2200)) {
      const lines = seg.text.split("\n");
      let currentText = "";
      for (let i = 0; i < lines.length; i++) {
        if (charCount + currentText.length + lines[i].length > 2200 && i > 0) {
          if (currentText) {
            currentPage.push({ type: "plain", text: currentText });
          }
          pages.push(currentPage);
          currentPage = [];
          charCount = 0;
          currentText = lines.slice(i).join("\n");
        } else {
          currentText += (i > 0 || currentText ? "\n" : "") + lines[i];
        }
      }
      if (currentText) {
        currentPage.push({ type: "plain", text: currentText });
        charCount += currentText.length;
      }
    } else {
      currentPage.push(seg);
      charCount += (seg.text ? seg.text.length : 0);
    }
  }
  if (currentPage.length > 0) {
    pages.push(currentPage);
  }
  return pages;
}

export function TextViewer({ text, annotations = [], activeIndex, setActiveIndex, hoveredIndex, setHoveredIndex }) {
  const containerRef = useRef(null);
  const [popover, setPopover] = useState(null);

  const str = String(text || "");
  const lowerStr = str.toLowerCase();
  const ranges = [];

  annotations.forEach((ann, annIdx) => {
    let start = -1;
    let end = -1;
    let found = false;

    if (ann.text && typeof ann.text === "string" && ann.text.trim()) {
      const phrase = ann.text.trim();
      let pos = str.indexOf(phrase);
      if (pos < 0) pos = lowerStr.indexOf(phrase.toLowerCase());
      if (pos < 0 && phrase.length >= 20) pos = lowerStr.indexOf(phrase.slice(0, 24).toLowerCase());
      if (pos >= 0) {
        start = pos;
        end = pos + Math.min(phrase.length, str.length - pos);
        found = true;
      }
    }

    if (!found && Number.isFinite(ann.start) && ann.start >= 0 && Number.isFinite(ann.end) && ann.end > ann.start && ann.end <= str.length) {
      start = Number(ann.start);
      end = Number(ann.end);
      found = true;
    }

    if (found && start >= 0 && end > start) {
      ranges.push({ start, end, annIdx, severity: ann.severity || "medium", title: ann.issue || "Pedagogy Note", ann });
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

  const pages = splitSegmentsIntoPages(segments);

  useSyncPopover(containerRef, annotations, activeIndex, hoveredIndex, setPopover);

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
      if (activeIndex === null || activeIndex === undefined) {
        setPopover(null);
      }
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
    <div ref={containerRef} style={{ position: "relative", width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 32 }}>
      {pages.map((pageSegs, pageNum) => (
        <div key={pageNum} className="document-page" style={{ padding: "36px 44px", position: "relative" }}>
          <pre className="DV-textContents" style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", margin: 0, lineHeight: 1.8, fontSize: "0.95rem" }}>
            {pageSegs.map((seg, i) => {
              if (seg.type === "plain") {
                return <span key={`plain-${pageNum}-${i}`}>{seg.text}</span>;
              }
              const isActive = seg.annIdx === activeIndex;
              const isHovered = seg.annIdx === hoveredIndex;
              return (
                <mark
                  key={`mark-${seg.annIdx}-${pageNum}-${i}`}
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
          <div style={{ position: "absolute", bottom: 16, right: 28, fontSize: "0.75rem", color: "var(--muted)", fontWeight: 600 }}>
            Page {pageNum + 1} of {pages.length}
          </div>
        </div>
      ))}
      <FloatingPopover
        ann={popover?.ann}
        rect={popover?.rect}
        containerRef={containerRef}
        onClose={() => {
          if (setActiveIndex) setActiveIndex(null);
          if (setHoveredIndex) setHoveredIndex(null);
          setPopover(null);
        }}
      />
    </div>
  );
}

// Helper to highlight phrases cleanly inside DocxViewer DOM
function applyDocxHighlights(container, annotations = []) {
  if (!container || !annotations.length) return;

  const existingMarks = container.querySelectorAll("mark[data-ann-idx]");
  if (existingMarks.length > 0 && existingMarks.length >= Math.min(annotations.length, 1)) return;

  const textNodes = [];
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (node.nodeValue && node.nodeValue.trim() && !node.parentElement?.closest("mark[data-ann-idx]")) {
      textNodes.push(node);
    }
  }

  annotations.forEach((ann, idx) => {
    if (!ann.text || typeof ann.text !== "string" || !ann.text.trim()) return;
    const phrase = ann.text.trim();
    const phraseLower = phrase.toLowerCase().replace(/\s+/g, " ");
    const severity = ann.severity || "medium";
    const title = ann.issue || "Pedagogy Note";

    let marked = false;

    // Try exact or prefix match inside single text node
    for (const node of textNodes) {
      if (!node.nodeValue || !node.parentElement || node.parentElement.closest("mark[data-ann-idx]")) continue;
      const nodeTextLower = node.nodeValue.toLowerCase().replace(/\s+/g, " ");
      if (nodeTextLower.includes(phraseLower)) {
        const firstWord = phrase.split(/\s+/)[0] || phrase.slice(0, 8);
        const realPos = node.nodeValue.toLowerCase().indexOf(firstWord.toLowerCase());
        if (realPos >= 0) {
          try {
            const range = document.createRange();
            range.setStart(node, realPos);
            range.setEnd(node, Math.min(node.nodeValue.length, realPos + phrase.length));
            const mark = document.createElement("mark");
            mark.className = `highlight ${severity}`;
            mark.dataset.annIdx = String(idx);
            mark.title = title;
            range.surroundContents(mark);
            marked = true;
            break;
          } catch {
            // ignore
          }
        }
      }
    }

    if (marked) return;

    // Try multi-word matching across Word .docx <w:t> splits
    const words = phraseLower.split(/\s+/).filter(w => w.length >= 5);
    let chunksMatched = 0;
    for (const word of words) {
      if (chunksMatched >= 2) break;
      for (const node of textNodes) {
        if (!node.nodeValue || !node.parentElement || node.parentElement.closest("mark[data-ann-idx]")) continue;
        const realPos = node.nodeValue.toLowerCase().indexOf(word);
        if (realPos >= 0) {
          try {
            const range = document.createRange();
            range.setStart(node, realPos);
            range.setEnd(node, realPos + word.length);
            const mark = document.createElement("mark");
            mark.className = `highlight ${severity}`;
            mark.dataset.annIdx = String(idx);
            mark.title = title;
            range.surroundContents(mark);
            chunksMatched++;
            marked = true;
            break;
          } catch {
            // ignore
          }
        }
      }
    }
  });
}

function injectDocxPageBreaks(container) {
  if (!container) return;
  const sections = container.querySelectorAll("section.docx");
  if (sections.length > 1) {
    // docx-preview already created multiple sections for hard page breaks
    sections.forEach((sec, i) => {
      if (!sec.querySelector(".docx-page-footer")) {
        const footer = document.createElement("div");
        footer.className = "docx-page-footer";
        footer.style.cssText = "position: absolute; bottom: 12px; right: 24px; font-size: 0.75rem; color: #94a3b8; font-weight: 600;";
        footer.textContent = `Page ${i + 1} of ${sections.length}`;
        sec.style.position = "relative";
        sec.appendChild(footer);
      }
    });
    return;
  }

  // If there is only 1 section or continuous sections taller than A4 height (~1123px), insert visual page break banners
  sections.forEach((sec) => {
    if (sec.scrollHeight > 1200) {
      const children = Array.from(sec.children);
      let pageNum = 1;
      let lastBreakOffset = 0;
      const pageHeight = 1123; // 297mm in pixels at standard DPI

      children.forEach((child) => {
        if (child.offsetTop - lastBreakOffset >= pageHeight) {
          lastBreakOffset = child.offsetTop;
          pageNum++;
          const divider = document.createElement("div");
          divider.className = "docx-page-break-divider";
          divider.style.cssText = "margin: 40px -44px; padding: 10px 44px; border-top: 2px dashed #cbd5e1; border-bottom: 2px dashed #cbd5e1; background: #f8fafc; color: #64748b; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; display: flex; justify-content: space-between; align-items: center; page-break-after: always;";
          divider.innerHTML = `<span>Page Break</span><span>Page ${pageNum}</span>`;
          sec.insertBefore(divider, child);
        }
      });
    }
  });
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
    if (!rendered || !innerRef.current) return;
    applyDocxHighlights(innerRef.current, annotations);
    injectDocxPageBreaks(innerRef.current);
  }, [rendered, annotations]);

  useSyncPopover(containerRef, annotations, activeIndex, hoveredIndex, setPopover);

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
      if (activeIndex === null || activeIndex === undefined) {
        setPopover(null);
      }
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
      <FloatingPopover
        ann={popover?.ann}
        rect={popover?.rect}
        containerRef={containerRef}
        onClose={() => {
          if (setActiveIndex) setActiveIndex(null);
          if (setHoveredIndex) setHoveredIndex(null);
          setPopover(null);
        }}
      />
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
      let start = -1;
      let end = -1;
      if (ann.text && typeof ann.text === "string" && ann.text.trim()) {
        const phrase = ann.text.trim().toLowerCase();
        let pos = fullText.toLowerCase().indexOf(phrase);
        if (pos < 0 && phrase.length >= 20) pos = fullText.toLowerCase().indexOf(phrase.slice(0, 24));
        if (pos >= 0) {
          start = pos;
          end = pos + Math.min(phrase.length, fullText.length - pos);
        }
      }
      if (start < 0 || end <= start) {
        if (Number.isFinite(ann.start) && Number.isFinite(ann.end) && ann.start >= 0 && ann.end > ann.start) {
          start = Number(ann.start);
          end = Number(ann.end);
        }
      }
      if (start < 0 || end <= start) return null;

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

  useSyncPopover(containerRef, annotations, activeIndex, hoveredIndex, setPopover);

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
      if (activeIndex === null || activeIndex === undefined) {
        setPopover(null);
      }
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
      <FloatingPopover
        ann={popover?.ann}
        rect={popover?.rect}
        containerRef={containerRef}
        onClose={() => {
          if (setActiveIndex) setActiveIndex(null);
          if (setHoveredIndex) setHoveredIndex(null);
          setPopover(null);
        }}
      />
    </div>
  );
}

