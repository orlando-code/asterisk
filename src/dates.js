import * as d3 from "d3";

const MONTHS = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

/**
 * Parse CSV `Start date` values like Jan-20, Feb-25 (first of month, 20xx).
 * @param {string|null|undefined} raw
 * @returns {Date|null}
 */
export function parseStartDate(raw) {
  const text = String(raw || "").trim();
  if (!text) return null;
  const match = text.match(/^([A-Za-z]{3})-(\d{2})$/);
  if (!match) {
    const fallback = new Date(text);
    return Number.isNaN(fallback.getTime()) ? null : fallback;
  }
  const mon = MONTHS[match[1].toLowerCase()];
  if (mon == null) return null;
  const year = 2000 + Number.parseInt(match[2], 10);
  return new Date(year, mon, 1);
}

/** @param {Date} date */
export function formatTimelineLabel(date) {
  return d3FormatMonthYear(date);
}

function d3FormatMonthYear(date) {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const yy = String(date.getFullYear()).slice(-2);
  return `${months[date.getMonth()]}-${yy}`;
}

/** Group key for stacking nodes that share a calendar month. */
export function monthBucketKey(raw) {
  const d = parseStartDate(raw);
  if (!d) return null;
  return `${d.getFullYear()}-${d.getMonth()}`;
}

/**
 * Slightly non-linear time → x: exponent > 1 spreads recent dates while keeping early gap visible.
 * @param {Date} minDate
 * @param {Date} maxDate
 * @param {[number, number]} range
 */
export function createTimelineXScale(minDate, maxDate, range) {
  const t0 = minDate.getTime();
  const t1 = maxDate.getTime();
  const span = Math.max(t1 - t0, 1);
  return d3
    .scalePow()
    .exponent(1.72)
    .domain([t0, t1 + span * 0.05])
    .range(range);
}
