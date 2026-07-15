/*
 * research-charts.js — ESLessonCraft MY Research Data Portal
 * ----------------------------------------------------------
 * Self-contained survey visualization (no external libraries).
 *
 * Renders diverging Likert stacked-bar charts and agreement donuts for three
 * Google Forms surveys whose response data is embedded below as CSV snapshots.
 * Every headline figure shown on the page (means, agreement rates, sample
 * sizes) is computed at runtime from these snapshots, so the displayed
 * numbers always match the underlying data.
 *
 * Snapshot captured: 2026-07-15
 *
 *   Needs assessment survey (pre-engagement) — 10 items, n = 67
 *     Source form:   https://docs.google.com/forms/d/1GKls_fD2dp5L3csXOqzHxbKsdKi4LrNJL48PPrcUYNQ
 *     Source sheet:  https://docs.google.com/spreadsheets/d/1YdLACsXXDl0Ig7K4PixVuNSgv0h0bYS-KjinnjjDxwk (gid=1944067189)
 *
 *   User satisfaction & usability survey (post-engagement) — 6 items, n = 25
 *     Source form:   https://docs.google.com/forms/d/1DkTKSg0r0OuVwWWPqaYFj4vOhkFKDOjt8XDpm0mRIN4
 *     Source sheet:  https://docs.google.com/spreadsheets/d/1LQly-xbpSVs9OEsl8aNiG5Ue7yq6T7EUw26Yy4LwaXo (gid=678881827)
 *
 *   Pedagogical impact & evaluation survey (post-engagement) — 15 items, n = 54
 *     Source sheet:  https://docs.google.com/spreadsheets/d/1O3xud7nrGyIiHlADm0p5cyS-soOxbT912vO-M5ENB10 (gid=0)
 *
 * To re-sync: export each sheet's current responses via the Google Sheets
 * gviz CSV endpoint and replace the NEEDS_CSV / SATISFACTION_CSV /
 * PEDAGOGICAL_CSV template strings below, then rebuild (`npm run build`).
 */
(function () {
  "use strict";

  /* ---- Embedded CSV snapshots (captured 2026-07-15) -------------------- */
  var NEEDS_CSV = String.raw`/*__NEEDS_CSV__*/`;
  var SATISFACTION_CSV = String.raw`/*__SAT_CSV__*/`;
  var PEDAGOGICAL_CSV = String.raw`/*__PED_CSV__*/`;

  /* ---- Likert scale (diverging: rose -> amber -> emerald) -------------- */
  var SCALE = [
    { v: 1, label: "Strongly Disagree", short: "SD", color: "#db2777" },
    { v: 2, label: "Disagree", short: "D", color: "#f472b6" },
    { v: 3, label: "Neutral", short: "N", color: "#f59e0b" },
    { v: 4, label: "Agree", short: "A", color: "#34d399" },
    { v: 5, label: "Strongly Agree", short: "SA", color: "#10b981" }
  ];
  var SVGNS = "http://www.w3.org/2000/svg";

  /* ---- Minimal RFC-4180-ish CSV parser -------------------------------- */
  function parseCSV(text) {
    var rows = [], row = [], field = "", inQ = false;
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (inQ) {
        if (c === '"') {
          if (text[i + 1] === '"') { field += '"'; i++; }
          else { inQ = false; }
        } else { field += c; }
      } else {
        if (c === '"') { inQ = true; }
        else if (c === ",") { row.push(field); field = ""; }
        else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
        else if (c === "\r") { /* ignore */ }
        else { field += c; }
      }
    }
    if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
    return rows.filter(function (r) { return r.some(function (cell) { return (cell || "").trim() !== ""; }); });
  }

  function ordinalOf(value) {
    var m = /^(\d+)/.exec((value || "").trim());
    return m ? parseInt(m[1], 10) : NaN;
  }

  /* ---- Survey model --------------------------------------------------- */
  function buildSurvey(csvText, meta) {
    var rows = parseCSV(csvText);
    var header = rows[0];
    var body = rows.slice(1);
    // Only treat columns with a non-empty header as questions; Google Forms
    // often pads the CSV with trailing empty columns that must be ignored.
    var qIndex = 0;
    var questions = header.slice(1).map(function (label, qi) {
      var col = qi + 1;
      var hasHeader = (label || "").trim() !== "";
      var counts = [0, 0, 0, 0, 0, 0]; // indexes 1..5
      var sum = 0, answered = 0;
      body.forEach(function (r) {
        var v = ordinalOf(r[col]);
        if (v >= 1 && v <= 5) { counts[v]++; sum += v; answered++; }
      });
      var n = answered;
      var mean = answered ? sum / answered : 0;
      var agree = counts[4] + counts[5];
      var pct = function (k) { return answered ? (counts[k] / answered) * 100 : 0; };
      var text = label.replace(/^\d+\.\s*/, "").replace(/^"|"$/g, "");
      var question = {
        num: hasHeader ? ++qIndex : null,
        label: label,
        text: text,
        counts: counts,
        n: n,
        mean: mean,
        agreePct: pct(4) + pct(5),
        pct: pct,
        hasHeader: hasHeader,
        answered: answered
      };
      return question;
    }).filter(function (q) { return q.hasHeader && q.answered > 0; });
    var n = body.length;
    var overallMean = avg(questions.map(function (q) { return q.mean; }));
    var overallAgree = avg(questions.map(function (q) { return q.agreePct; }));
    return { rows: rows, header: header, body: body, questions: questions, n: n,
             overallMean: overallMean, overallAgree: overallAgree, meta: meta };
  }

  /* ---- helpers -------------------------------------------------------- */
  function avg(arr) { return arr.length ? arr.reduce(function (a, b) { return a + b; }, 0) / arr.length : 0; }
  function fmt(n, d) { d = d == null ? 1 : d; var p = Math.pow(10, d); return (Math.round(n * p) / p).toFixed(d); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function meanColor(m) { return m >= 4 ? "#10b981" : m >= 3 ? "#f59e0b" : "#db2777"; }
  function tint(hex) { return hex + "26"; } // ~15% alpha by appending hex alpha

  function h(tag, attrs) {
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      if (k === "class") e.className = attrs[k];
      else if (k === "html") e.innerHTML = attrs[k];
      else if (k === "style") e.setAttribute("style", attrs[k]);
      else if (attrs[k] != null) e.setAttribute(k, attrs[k]);
    }
    for (var i = 2; i < arguments.length; i++) {
      var kid = arguments[i];
      if (kid == null) continue;
      e.appendChild(typeof kid === "string" ? document.createTextNode(kid) : kid);
    }
    return e;
  }
  function svgEl(name, attrs) {
    var e = document.createElementNS(SVGNS, name);
    if (attrs) for (var k in attrs) if (attrs[k] != null) e.setAttribute(k, attrs[k]);
    return e;
  }
  /* Fill one element by id (chart containers, unique slots). */
  function fill(id, val) { var e = document.getElementById(id); if (e) e.textContent = val; }
  /* Fill every element carrying data-fill="<key>" with <val>. Lets the same
     computed value (e.g. n, overall mean) appear in several places safely. */
  var FILLS = {};
  function setFill(key, val) { FILLS[key] = String(val); }
  function applyFills() {
    var nodes = document.querySelectorAll("[data-fill]");
    for (var i = 0; i < nodes.length; i++) {
      var key = nodes[i].getAttribute("data-fill");
      if (FILLS[key] != null) nodes[i].textContent = FILLS[key];
    }
  }

  /* ---- Tooltip (shared per container) --------------------------------- */
  function attachTooltip(container) {
    var tip = h("div", { class: "rc-tooltip" });
    container.appendChild(tip);
    container.addEventListener("mousemove", function (ev) {
      var t = ev.target.closest("[data-tip]");
      if (t) {
        tip.innerHTML = t.getAttribute("data-tip");
        tip.style.opacity = "1";
        var rect = container.getBoundingClientRect();
        tip.style.left = (ev.clientX - rect.left + 14) + "px";
        tip.style.top = (ev.clientY - rect.top + 14) + "px";
      } else { tip.style.opacity = "0"; }
    });
    container.addEventListener("mouseleave", function () { tip.style.opacity = "0"; });
  }

  /* ---- Legend --------------------------------------------------------- */
  function renderLegend() {
    var wrap = h("div", { class: "rc-legend" });
    SCALE.forEach(function (s) {
      wrap.appendChild(h("span", { class: "rc-legend-item" },
        h("i", { class: "rc-dot", style: "background:" + s.color }),
        s.label
      ));
    });
    return wrap;
  }

  /* ---- Likert 100% stacked bar (SVG) ---------------------------------- */
  function likertBarSVG(q) {
    var W = 600, H = 24;
    var svg = svgEl("svg", { viewBox: "0 0 " + W + " " + H, preserveAspectRatio: "none", class: "rc-likert-svg" });
    var x = 0;
    SCALE.forEach(function (s) {
      var count = q.counts[s.v];
      var w = q.n ? (count / q.n) * W : 0;
      if (w > 0) {
        var rect = svgEl("rect", {
          x: x.toFixed(2), y: 0, width: w.toFixed(2), height: H, fill: s.color,
          "data-tip": s.label + ": " + count + " (" + fmt(q.pct(s.v), 0) + "%)"
        });
        svg.appendChild(rect);
      }
      x += w;
    });
    return svg;
  }

  function renderLikertGrid(container, survey) {
    if (!container) return;
    container.appendChild(renderLegend());
    survey.questions.forEach(function (q) {
      var mc = meanColor(q.mean);
      var row = h("div", { class: "rc-row" },
        h("div", { class: "rc-row-head" },
          h("div", { class: "rc-q" },
            h("span", { class: "rc-q-num" }, "Q" + q.num + "."),
            h("span", { class: "rc-q-text" }, q.text)
          ),
          h("div", { class: "rc-q-stat" },
            h("span", { class: "rc-mean-badge", style: "background:" + tint(mc) + ";color:" + mc }, "M = " + fmt(q.mean, 2)),
            h("span", { class: "rc-n" }, "n = " + q.n)
          )
        ),
        h("div", { class: "rc-bar" }, likertBarSVG(q))
      );
      container.appendChild(row);
    });
    attachTooltip(container);
  }

  /* ---- Agreement donut (SVG) ------------------------------------------ */
  function renderDonut(container, survey, qIndex, opts) {
    if (!container) return;
    opts = opts || {};
    var q = survey.questions[qIndex];
    var pct = clamp(q.agreePct, 0, 100);
    var cx = 70, cy = 70, R = 52, SW = 16, C = 2 * Math.PI * R;
    var dash = (pct / 100) * C;
    var svg = svgEl("svg", { viewBox: "0 0 140 140", class: "rc-donut" });
    svg.appendChild(svgEl("circle", { cx: cx, cy: cy, r: R, fill: "none", stroke: "rgba(124,58,237,0.15)", "stroke-width": SW }));
    var fg = svgEl("circle", {
      cx: cx, cy: cy, r: R, fill: "none", stroke: "#10b981", "stroke-width": SW,
      "stroke-dasharray": dash.toFixed(2) + " " + C.toFixed(2), "stroke-linecap": "round",
      transform: "rotate(-90 " + cx + " " + cy + ")", class: "rc-donut-arc"
    });
    svg.appendChild(fg);
    var block = h("div", { class: "rc-donut-wrap" },
      svg,
      h("div", { class: "rc-donut-center" },
        h("span", { class: "rc-donut-pct" }, fmt(pct, 0) + "%"),
        h("span", { class: "rc-donut-label" }, opts.label || "Agreement")
      )
    );
    container.appendChild(block);
    if (opts.caption) container.appendChild(h("p", { class: "rc-donut-caption" }, opts.caption));
  }

  /* ---- Init ----------------------------------------------------------- */
  function init() {
    var needs = buildSurvey(NEEDS_CSV, { name: "Needs assessment" });
    var sat = buildSurvey(SATISFACTION_CSV, { name: "User satisfaction" });
    var ped = buildSurvey(PEDAGOGICAL_CSV, { name: "Pedagogical impact" });

    // Charts
    renderLikertGrid(document.getElementById("needs-charts"), needs);
    renderLikertGrid(document.getElementById("sat-charts"), sat);
    renderLikertGrid(document.getElementById("ped-charts"), ped);
    renderDonut(document.getElementById("needs-donut"), needs, 9,
      { label: "Would use regularly", caption: "Q10 · intention to adopt a reliable RPH assistant" });
    renderDonut(document.getElementById("sat-donut"), sat, 5,
      { label: "Would recommend", caption: "Q6 · peer recommendation intent" });
    renderDonut(document.getElementById("ped-donut"), ped, 14,
      { label: "Positive impact", caption: "Q15 · overall positive impact on teaching practice" });

    // All computed headline figures (keys map to data-fill="<key>" in HTML).
    setFill("needs-n", needs.n);
    setFill("needs-overall-mean", fmt(needs.overallMean, 2));
    setFill("needs-overall-agree", fmt(needs.overallAgree, 0) + "%");
    setFill("needs-q1-pct", fmt(needs.questions[0].agreePct, 0) + "%");
    setFill("needs-q2-pct", fmt(needs.questions[1].agreePct, 0) + "%");
    setFill("needs-q3-pct", fmt(needs.questions[2].agreePct, 0) + "%");
    setFill("needs-q6-pct", fmt(needs.questions[5].agreePct, 0) + "%");
    setFill("needs-q7-pct", fmt(needs.questions[6].agreePct, 0) + "%");
    setFill("needs-q10-pct", fmt(needs.questions[9].agreePct, 0) + "%");
    setFill("needs-q10-mean", fmt(needs.questions[9].mean, 2));

    setFill("sat-n", sat.n);
    setFill("sat-overall-mean", fmt(sat.overallMean, 2));
    setFill("sat-overall-agree", fmt(sat.overallAgree, 0) + "%");
    setFill("sat-q1-pct", fmt(sat.questions[0].agreePct, 0) + "%");
    setFill("sat-q3-pct", fmt(sat.questions[2].agreePct, 0) + "%");
    setFill("sat-q4-pct", fmt(sat.questions[3].agreePct, 0) + "%");
    setFill("sat-q6-pct", fmt(sat.questions[5].agreePct, 0) + "%");
    setFill("sat-q6-mean", fmt(sat.questions[5].mean, 2));

    setFill("ped-n", ped.n);
    setFill("ped-overall-mean", fmt(ped.overallMean, 2));
    setFill("ped-overall-agree", fmt(ped.overallAgree, 0) + "%");
    setFill("ped-q1-pct", fmt(ped.questions[0].agreePct, 0) + "%");
    setFill("ped-q1-mean", fmt(ped.questions[0].mean, 2));
    setFill("ped-q5-pct", fmt(ped.questions[4].agreePct, 0) + "%");
    setFill("ped-q5-mean", fmt(ped.questions[4].mean, 2));
    setFill("ped-q6-pct", fmt(ped.questions[5].agreePct, 0) + "%");
    setFill("ped-q9-pct", fmt(ped.questions[8].agreePct, 0) + "%");
    setFill("ped-q10-pct", fmt(ped.questions[9].agreePct, 0) + "%");
    setFill("ped-q14-pct", fmt(ped.questions[13].agreePct, 0) + "%");
    setFill("ped-q14-mean", fmt(ped.questions[13].mean, 2));
    setFill("ped-q15-pct", fmt(ped.questions[14].agreePct, 0) + "%");
    setFill("ped-q15-mean", fmt(ped.questions[14].mean, 2));

    // Hero stat tile (corrected to the real computed satisfaction mean)
    fill("stat-sat-mean", fmt(sat.overallMean, 2) + " / 5.0");
    fill("stat-sat-note", "Post-use Satisfaction (n = " + sat.n + ")");
    applyFills();

    // console signpost for quick verification
    if (window.console) {
      console.log("[research-charts] Needs: n=" + needs.n + ", M=" + fmt(needs.overallMean, 2) + ", agree=" + fmt(needs.overallAgree, 0) + "%");
      console.log("[research-charts] Satisfaction: n=" + sat.n + ", M=" + fmt(sat.overallMean, 2) + ", agree=" + fmt(sat.overallAgree, 0) + "%");
      console.log("[research-charts] Pedagogical: n=" + ped.n + ", M=" + fmt(ped.overallMean, 2) + ", agree=" + fmt(ped.overallAgree, 0) + "%");
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
