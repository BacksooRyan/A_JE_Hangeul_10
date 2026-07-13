"use strict";

/* ---------- 공통 유틸 ---------- */

const $ = (id) => document.getElementById(id);

// "1,234.5" 같은 입력을 숫자로. 비어 있거나 숫자가 아니면 null
function parseNum(str) {
  const cleaned = String(str).replace(/,/g, "").trim();
  if (cleaned === "" || cleaned === "-" || cleaned === ".") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function fmt(n, maxDecimals = 2) {
  return n.toLocaleString("ko-KR", { maximumFractionDigits: maxDecimals });
}

function fmtWon(n) {
  return fmt(Math.round(n)) + "원";
}

// 입력창에 천 단위 콤마를 유지하면서 커서 위치를 보존
function attachComma(input) {
  input.addEventListener("input", () => {
    const raw = input.value.replace(/,/g, "");
    if (raw === "" || !/^-?\d*\.?\d*$/.test(raw)) return;
    const [intPart, decPart] = raw.split(".");
    if (intPart === "" || intPart === "-") return;
    const before = input.selectionStart;
    const commasBefore = (input.value.slice(0, before).match(/,/g) || []).length;
    let formatted = Number(intPart).toLocaleString("ko-KR");
    if (decPart !== undefined) formatted += "." + decPart;
    input.value = formatted;
    const commasAfter = (formatted.slice(0, before - commasBefore + (formatted.match(/,/g) || []).length).match(/,/g) || []).length;
    const pos = before - commasBefore + commasAfter;
    input.setSelectionRange(pos, pos);
  });
}

/* ---------- 탭 ---------- */

const tabs = document.querySelectorAll(".tab");
const panels = document.querySelectorAll(".panel");

function activateTab(name) {
  tabs.forEach((t) => {
    const on = t.dataset.tab === name;
    t.classList.toggle("active", on);
    t.setAttribute("aria-selected", on);
  });
  panels.forEach((p) => p.classList.toggle("active", p.id === "panel-" + name));
  try { localStorage.setItem("lifecalc-tab", name); } catch (_) {}
}

tabs.forEach((t) => t.addEventListener("click", () => activateTab(t.dataset.tab)));

let savedTab = null;
try { savedTab = localStorage.getItem("lifecalc-tab"); } catch (_) {}
activateTab(document.querySelector(`.tab[data-tab="${savedTab}"]`) ? savedTab : "dday");

/* ---------- 날짜 · D-day ---------- */

const MS_DAY = 86400000;

function toLocalDate(value) {
  // <input type="date"> 값(YYYY-MM-DD)을 로컬 자정 기준 Date로
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function todayLocal() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function fmtDate(d) {
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${days[d.getDay()]})`;
}

$("dday-target").addEventListener("input", () => {
  const v = $("dday-target").value;
  const out = $("dday-result");
  if (!v) { out.textContent = "날짜를 선택하세요"; return; }
  const diff = Math.round((toLocalDate(v) - todayLocal()) / MS_DAY);
  if (diff > 0) out.innerHTML = `<strong>D-${diff}</strong> · ${diff}일 남았습니다`;
  else if (diff === 0) out.innerHTML = "<strong>D-Day</strong> · 바로 오늘!";
  else out.innerHTML = `<strong>D+${-diff}</strong> · ${-diff}일 지났습니다`;
});

function updateBetween() {
  const s = $("between-start").value;
  const e = $("between-end").value;
  const out = $("between-result");
  if (!s || !e) { out.textContent = "두 날짜를 선택하세요"; return; }
  const diff = Math.round((toLocalDate(e) - toLocalDate(s)) / MS_DAY);
  const abs = Math.abs(diff);
  out.innerHTML =
    `차이: <strong>${fmt(abs, 0)}일</strong> (${fmt(abs / 7, 1)}주)\n` +
    `시작일 포함 시 ${fmt(abs + 1, 0)}일`;
}
$("between-start").addEventListener("input", updateBetween);
$("between-end").addEventListener("input", updateBetween);

function updateAfter() {
  const base = $("after-base").value;
  const days = parseNum($("after-days").value);
  const out = $("after-result");
  if (!base || days === null) { out.textContent = "기준일과 일수를 입력하세요"; return; }
  const d = toLocalDate(base);
  d.setDate(d.getDate() + Math.trunc(days));
  const dir = days >= 0 ? "후" : "전";
  out.innerHTML = `${Math.abs(Math.trunc(days))}일 ${dir}: <strong>${fmtDate(d)}</strong>`;
}
$("after-base").addEventListener("input", updateAfter);
$("after-days").addEventListener("input", updateAfter);

/* ---------- 퍼센트 ---------- */

function updatePct1() {
  const total = parseNum($("pct1-total").value);
  const rate = parseNum($("pct1-rate").value);
  $("pct1-result").textContent =
    total === null || rate === null ? "—" : fmt(total * rate / 100);
}
function updatePct2() {
  const part = parseNum($("pct2-part").value);
  const total = parseNum($("pct2-total").value);
  $("pct2-result").textContent =
    part === null || total === null || total === 0 ? "—" : fmt(part / total * 100) + "%";
}
function updatePct3() {
  const from = parseNum($("pct3-from").value);
  const to = parseNum($("pct3-to").value);
  const out = $("pct3-result");
  if (from === null || to === null || from === 0) { out.textContent = "—"; return; }
  const rate = (to - from) / Math.abs(from) * 100;
  const sign = rate > 0 ? "▲ " : rate < 0 ? "▼ " : "";
  out.textContent = `${sign}${fmt(Math.abs(rate))}% ${rate >= 0 ? "증가" : "감소"}`;
}
["pct1-total", "pct1-rate"].forEach((id) => $(id).addEventListener("input", updatePct1));
["pct2-part", "pct2-total"].forEach((id) => $(id).addEventListener("input", updatePct2));
["pct3-from", "pct3-to"].forEach((id) => $(id).addEventListener("input", updatePct3));

/* ---------- 부가세 (10%) ---------- */

$("vat-total").addEventListener("input", () => {
  const total = parseNum($("vat-total").value);
  const out = $("vat-total-result");
  if (total === null) { out.textContent = "금액을 입력하세요"; return; }
  const supply = total / 1.1;
  out.innerHTML =
    `공급가액: <strong>${fmtWon(supply)}</strong>\n` +
    `부가세: <strong>${fmtWon(total - supply)}</strong>`;
});

$("vat-supply").addEventListener("input", () => {
  const supply = parseNum($("vat-supply").value);
  const out = $("vat-supply-result");
  if (supply === null) { out.textContent = "금액을 입력하세요"; return; }
  const vat = supply * 0.1;
  out.innerHTML =
    `부가세: <strong>${fmtWon(vat)}</strong>\n` +
    `합계금액: <strong>${fmtWon(supply + vat)}</strong>`;
});

/* ---------- 할인율 ---------- */

function updateDisc() {
  const price = parseNum($("disc-price").value);
  const rate = parseNum($("disc-rate").value);
  const out = $("disc-result");
  if (price === null || rate === null) { out.textContent = "정가와 할인율을 입력하세요"; return; }
  const sale = price * (1 - rate / 100);
  out.innerHTML =
    `할인가: <strong>${fmtWon(sale)}</strong>\n` +
    `절약: ${fmtWon(price - sale)}`;
}
["disc-price", "disc-rate"].forEach((id) => $(id).addEventListener("input", updateDisc));

function updateDisc2() {
  const orig = parseNum($("disc2-orig").value);
  const sale = parseNum($("disc2-sale").value);
  const out = $("disc2-result");
  if (orig === null || sale === null || orig === 0) { out.textContent = "—"; return; }
  out.textContent = fmt((orig - sale) / orig * 100) + "% 할인";
}
["disc2-orig", "disc2-sale"].forEach((id) => $(id).addEventListener("input", updateDisc2));

/* ---------- 평수 ---------- */

const PYEONG_TO_SQM = 3.305785;
let pyeongLock = false; // 상호 갱신 루프 방지

$("py-pyeong").addEventListener("input", () => {
  if (pyeongLock) return;
  const p = parseNum($("py-pyeong").value);
  pyeongLock = true;
  $("py-sqm").value = p === null ? "" : fmt(p * PYEONG_TO_SQM);
  pyeongLock = false;
});

$("py-sqm").addEventListener("input", () => {
  if (pyeongLock) return;
  const s = parseNum($("py-sqm").value);
  pyeongLock = true;
  $("py-pyeong").value = s === null ? "" : fmt(s / PYEONG_TO_SQM);
  pyeongLock = false;
});

/* ---------- 단위 변환 ---------- */

const UNITS = {
  길이: { base: "m", units: { km: 1000, m: 1, cm: 0.01, mm: 0.001, 마일: 1609.344, 야드: 0.9144, 피트: 0.3048, 인치: 0.0254 } },
  무게: { base: "kg", units: { t: 1000, kg: 1, g: 0.001, 파운드: 0.45359237, 온스: 0.028349523, 근: 0.6, 돈: 0.00375 } },
  부피: { base: "L", units: { L: 1, mL: 0.001, "갤런(미국)": 3.785411784, 컵: 0.24, 큰술: 0.015, 작은술: 0.005 } },
  온도: { special: true, units: ["°C", "°F", "K"] },
};

const catSel = $("unit-category");
const fromSel = $("unit-from");
const unitVal = $("unit-value");
const unitOut = $("unit-result");

Object.keys(UNITS).forEach((k) => catSel.add(new Option(k, k)));

function fillUnits() {
  fromSel.innerHTML = "";
  const cat = UNITS[catSel.value];
  const names = cat.special ? cat.units : Object.keys(cat.units);
  names.forEach((u) => fromSel.add(new Option(u, u)));
  updateUnit();
}

function convertTemp(v, from) {
  const c = from === "°C" ? v : from === "°F" ? (v - 32) * 5 / 9 : v - 273.15;
  return { "°C": c, "°F": c * 9 / 5 + 32, K: c + 273.15 };
}

function updateUnit() {
  const v = parseNum(unitVal.value);
  if (v === null) { unitOut.textContent = "값을 입력하세요"; return; }
  const cat = UNITS[catSel.value];
  const from = fromSel.value;
  let lines;
  if (cat.special) {
    const temps = convertTemp(v, from);
    lines = Object.entries(temps)
      .filter(([u]) => u !== from)
      .map(([u, val]) => `${fmt(val)} ${u}`);
  } else {
    const baseVal = v * cat.units[from];
    lines = Object.entries(cat.units)
      .filter(([u]) => u !== from)
      .map(([u, factor]) => `${fmt(baseVal / factor, 6)} ${u}`);
  }
  unitOut.innerHTML = `<strong>${fmt(v, 6)} ${from}</strong> =\n` + lines.join("\n");
}

catSel.addEventListener("change", fillUnits);
fromSel.addEventListener("change", updateUnit);
unitVal.addEventListener("input", updateUnit);
fillUnits();

/* ---------- 콤마 자동 입력 적용 ---------- */

["pct1-total", "pct2-part", "pct2-total", "pct3-from", "pct3-to",
 "vat-total", "vat-supply", "disc-price", "disc2-orig", "disc2-sale"]
  .forEach((id) => attachComma($(id)));
