#!/usr/bin/env node
// Lists one day's meetings from the calendars in ~/.headquarters/calendars/calendars.json.
//
//   node meetings.mjs [YYYY-MM-DD] [--config <path>] [--include-declined]
//
// Prints JSON: { date, timeZone, events: [...], errors: [...] }. No dependencies.
// Handles RRULE (DAILY/WEEKLY/MONTHLY/YEARLY with INTERVAL, COUNT, UNTIL, BYDAY,
// BYMONTHDAY, BYMONTH, BYSETPOS, WKST), EXDATE, RECURRENCE-ID overrides, cancelled
// events, the user's own RSVP, Windows time zone names, and the same meeting
// appearing on several calendars. Drops cancelled and declined events; marks
// show-as-free events `free`.

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const DAY_MS = 86_400_000;
const WEEKDAYS = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

const WINDOWS_ZONES = {
  "Eastern Standard Time": "America/New_York",
  "US Eastern Standard Time": "America/Indianapolis",
  "Central Standard Time": "America/Chicago",
  "Mountain Standard Time": "America/Denver",
  "US Mountain Standard Time": "America/Phoenix",
  "Pacific Standard Time": "America/Los_Angeles",
  "Alaskan Standard Time": "America/Anchorage",
  "Hawaiian Standard Time": "Pacific/Honolulu",
  "Atlantic Standard Time": "America/Halifax",
  "Newfoundland Standard Time": "America/St_Johns",
  "Central Standard Time (Mexico)": "America/Mexico_City",
  "SA Pacific Standard Time": "America/Bogota",
  "E. South America Standard Time": "America/Sao_Paulo",
  "Argentina Standard Time": "America/Buenos_Aires",
  "UTC": "UTC",
  "GMT Standard Time": "Europe/London",
  "Greenwich Standard Time": "Atlantic/Reykjavik",
  "W. Europe Standard Time": "Europe/Berlin",
  "Romance Standard Time": "Europe/Paris",
  "Central Europe Standard Time": "Europe/Budapest",
  "Central European Standard Time": "Europe/Warsaw",
  "E. Europe Standard Time": "Europe/Chisinau",
  "FLE Standard Time": "Europe/Kiev",
  "GTB Standard Time": "Europe/Bucharest",
  "Israel Standard Time": "Asia/Jerusalem",
  "South Africa Standard Time": "Africa/Johannesburg",
  "Russian Standard Time": "Europe/Moscow",
  "Arabian Standard Time": "Asia/Dubai",
  "India Standard Time": "Asia/Kolkata",
  "SE Asia Standard Time": "Asia/Bangkok",
  "China Standard Time": "Asia/Shanghai",
  "Singapore Standard Time": "Asia/Singapore",
  "Tokyo Standard Time": "Asia/Tokyo",
  "Korea Standard Time": "Asia/Seoul",
  "AUS Eastern Standard Time": "Australia/Sydney",
  "New Zealand Standard Time": "Pacific/Auckland",
};

// ---------- entry point ----------

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const option = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const configPath = option("--config") || path.join(os.homedir(), ".headquarters", "calendars", "calendars.json");
const includeDeclined = flag("--include-declined");

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

async function main() {
  const config = JSON.parse(await fs.readFile(configPath, "utf8"));
  const timeZone = config.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const dateArg = args.find((a) => /^\d{4}-\d{2}-\d{2}$/.test(a));
  const date = dateArg || todayIn(timeZone);
  const target = dayNumber(...date.split("-").map(Number));
  const dayStart = wallToUtc({ ...wallOfDay(target), hh: 0, mi: 0, ss: 0 }, timeZone);
  const dayEnd = wallToUtc({ ...wallOfDay(target + 1), hh: 0, mi: 0, ss: 0 }, timeZone);

  const errors = [];
  const found = [];
  for (const calendar of config.calendars || []) {
    try {
      const text = await loadCalendar(calendar, configPath);
      const events = parseIcs(text, calendar, timeZone, errors);
      found.push(...eventsOnDay(events, { target, dayStart, dayEnd }));
    } catch (error) {
      errors.push(`${calendar.name}: ${error.message}`);
    }
  }

  const visible = found.filter((e) => includeDeclined || e.response !== "declined");
  const events = dedupe(visible)
    .sort((a, b) => (a.allDay === b.allDay ? a.startMs - b.startMs || a.title.localeCompare(b.title) : a.allDay ? -1 : 1))
    .map((e) => ({
      title: e.title,
      allDay: e.allDay,
      start: e.allDay ? null : formatTime(e.startMs, timeZone),
      end: e.allDay ? null : formatTime(e.endMs, timeZone),
      startIso: e.allDay ? null : new Date(e.startMs).toISOString(),
      endIso: e.allDay ? null : new Date(e.endMs).toISOString(),
      calendars: e.calendars,
      response: e.response,
      ...(e.free ? { free: true } : {}),
      ...(e.location ? { location: e.location } : {}),
    }));

  console.log(JSON.stringify({ date, timeZone, events, errors }, null, 2));
}

async function loadCalendar(calendar, fromConfig) {
  if (calendar.path) {
    return fs.readFile(path.resolve(path.dirname(fromConfig), calendar.path), "utf8");
  }
  const response = await fetch(calendar.url);
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.text();
}

// ---------- ICS parsing ----------

function parseIcs(text, calendar, fallbackZone, errors) {
  const unknownZones = new Set();
  const raw = [];
  let current = null;
  for (const line of unfold(text)) {
    if (line === "BEGIN:VEVENT") current = {};
    else if (line === "END:VEVENT") {
      if (current) raw.push(current);
      current = null;
    } else if (current) {
      const prop = parseProperty(line);
      if (prop) (current[prop.name] ||= []).push(prop);
    }
  }

  const zoneOf = (prop) => {
    if (prop.value.endsWith("Z")) return "UTC";
    const tzid = prop.params.TZID;
    if (!tzid) return fallbackZone;
    const zone = resolveZone(tzid);
    if (zone) return zone;
    unknownZones.add(tzid);
    return fallbackZone;
  };

  const events = [];
  for (const props of raw) {
    const first = (name) => props[name]?.[0];
    const startProp = first("DTSTART");
    if (!startProp) continue;
    const start = parseDateValue(startProp.value);
    if (!start) continue;
    const zone = zoneOf(startProp);

    const title = unescapeText(first("SUMMARY")?.value || "(no title)");
    const status = (first("STATUS")?.value || "").toUpperCase();
    const event = {
      uid: first("UID")?.value || `${title}@${startProp.value}`,
      title,
      cancelled: status === "CANCELLED" || /^(canceled|cancelled)\s*:/i.test(title),
      free: (first("TRANSP")?.value || "").trim().toUpperCase() === "TRANSPARENT",
      calendar: calendar.name,
      response: responseFor(props, calendar.email),
      location: plainLocation(first("LOCATION")?.value),
      allDay: start.allDay,
      wall: start,
      zone,
      rrule: parseRRule(first("RRULE")?.value),
      exdates: new Set(),
      recurrenceId: null,
    };

    if (start.allDay) {
      const end = first("DTEND") ? parseDateValue(first("DTEND").value) : null;
      event.startDay = dayNumber(start.y, start.m, start.d);
      event.days = end ? Math.max(1, dayNumber(end.y, end.m, end.d) - event.startDay) : 1;
    } else {
      event.startMs = wallToUtc(start, zone);
      const endProp = first("DTEND");
      const end = endProp ? parseDateValue(endProp.value) : null;
      const duration = first("DURATION") ? parseDuration(first("DURATION").value) : 0;
      event.durationMs = end ? Math.max(0, wallToUtc(end, zoneOf(endProp)) - event.startMs) : duration;
    }

    for (const prop of props.EXDATE || []) {
      for (const value of prop.value.split(",")) {
        const key = instantKey(parseDateValue(value), zoneOf({ ...prop, value }));
        if (key !== null) event.exdates.add(key);
      }
    }

    const ridProp = first("RECURRENCE-ID");
    if (ridProp) event.recurrenceId = instantKey(parseDateValue(ridProp.value), zoneOf(ridProp));

    events.push(event);
  }

  for (const tzid of unknownZones) {
    errors.push(`${calendar.name}: unknown time zone "${tzid}", read as ${fallbackZone}`);
  }
  return events;
}

function unfold(text) {
  const lines = [];
  for (const line of text.split(/\r\n|\r|\n/)) {
    if (/^[ \t]/.test(line) && lines.length) lines[lines.length - 1] += line.slice(1);
    else lines.push(line);
  }
  return lines;
}

function parseProperty(line) {
  // Split name;params from the value at the first colon outside quotes.
  let inQuotes = false;
  let colon = -1;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') inQuotes = !inQuotes;
    else if (line[i] === ":" && !inQuotes) {
      colon = i;
      break;
    }
  }
  if (colon < 0) return null;
  const [name, ...parts] = line.slice(0, colon).split(";");
  const params = {};
  for (const part of parts) {
    const eq = part.indexOf("=");
    if (eq > 0) params[part.slice(0, eq).toUpperCase()] = part.slice(eq + 1).replace(/^"|"$/g, "");
  }
  return { name: name.toUpperCase(), params, value: line.slice(colon + 1) };
}

function parseDateValue(value) {
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})Z?)?$/.exec(value.trim());
  if (!m) return null;
  const [, y, mo, d, hh, mi, ss] = m;
  return hh === undefined
    ? { allDay: true, y: +y, m: +mo, d: +d, hh: 0, mi: 0, ss: 0 }
    : { allDay: false, y: +y, m: +mo, d: +d, hh: +hh, mi: +mi, ss: +ss };
}

// A comparable key for an occurrence: UTC ms for timed values, the day number for dates.
function instantKey(wall, zone) {
  if (!wall) return null;
  return wall.allDay ? dayNumber(wall.y, wall.m, wall.d) : wallToUtc(wall, zone);
}

function parseDuration(value) {
  const m = /^([+-])?P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(value);
  if (!m) return 0;
  const [, , w = 0, d = 0, h = 0, mi = 0, s = 0] = m;
  return ((+w * 7 + +d) * 86400 + +h * 3600 + +mi * 60 + +s) * 1000;
}

function parseRRule(value) {
  if (!value) return null;
  const rule = {};
  for (const part of value.split(";")) {
    const [k, v] = part.split("=");
    if (k && v) rule[k.toUpperCase()] = v;
  }
  return rule.FREQ ? rule : null;
}

function unescapeText(value) {
  return value.replace(/\\n/gi, " ").replace(/\\([,;\\])/g, "$1").replace(/\s+/g, " ").trim();
}

function plainLocation(value) {
  if (!value) return null;
  const text = unescapeText(value);
  return !text || /https?:\/\//i.test(text) ? null : text;
}

function responseFor(props, email) {
  const me = (email || "").toLowerCase();
  if (!me) return "unknown";
  const address = (prop) => prop.value.replace(/^mailto:/i, "").toLowerCase();
  const organizer = props.ORGANIZER?.[0];
  const attendee = (props.ATTENDEE || []).find((a) => address(a) === me);
  if (attendee) {
    const state = (attendee.params.PARTSTAT || "NEEDS-ACTION").toLowerCase();
    if (state !== "needs-action" || !organizer || address(organizer) !== me) return state;
  }
  if (organizer && address(organizer) === me) return "organizer";
  return props.ATTENDEE?.length ? "unknown" : "none";
}

// ---------- expanding to one day ----------

function eventsOnDay(events, day) {
  const overridden = new Map();
  for (const e of events) {
    if (e.recurrenceId !== null) {
      if (!overridden.has(e.uid)) overridden.set(e.uid, new Set());
      overridden.get(e.uid).add(e.recurrenceId);
    }
  }

  const out = [];
  for (const e of events) {
    const skip = overridden.get(e.uid) || new Set();
    const occurrences = e.rrule && e.recurrenceId === null ? expand(e, day) : [single(e)];
    for (const occ of occurrences) {
      if (e.recurrenceId === null && e.rrule && (skip.has(occ.key) || e.exdates.has(occ.key))) continue;
      if (e.cancelled) continue;
      if (!overlaps(occ, day)) continue;
      out.push({
        title: e.title,
        allDay: e.allDay,
        startMs: occ.startMs ?? null,
        endMs: occ.endMs ?? null,
        startDay: occ.startDay ?? null,
        calendars: [e.calendar],
        response: e.response,
        free: e.free,
        location: e.location,
      });
    }
  }
  return out;
}

function single(e) {
  return e.allDay
    ? { startDay: e.startDay, endDay: e.startDay + e.days }
    : { startMs: e.startMs, endMs: e.startMs + e.durationMs };
}

function overlaps(occ, day) {
  if (occ.startDay !== undefined) return occ.startDay <= day.target && day.target < occ.endDay;
  if (occ.endMs === occ.startMs) return occ.startMs >= day.dayStart && occ.startMs < day.dayEnd;
  return occ.startMs < day.dayEnd && occ.endMs > day.dayStart;
}

// Walks the rule day by day in the event's own wall clock, so DST shifts land right.
function expand(e, day) {
  const rule = e.rrule;
  const interval = Math.max(1, Number(rule.INTERVAL || 1));
  const count = rule.COUNT ? Number(rule.COUNT) : Infinity;
  const until = rule.UNTIL ? parseDateValue(rule.UNTIL) : null;
  const untilKey = until ? (until.allDay ? dayNumber(until.y, until.m, until.d) : wallToUtc(until, rule.UNTIL.endsWith("Z") ? "UTC" : e.zone)) : null;
  const startDay = dayNumber(e.wall.y, e.wall.m, e.wall.d);
  const spanDays = e.allDay ? e.days : Math.ceil(e.durationMs / DAY_MS);
  const firstUseful = day.target - spanDays - 2;
  const lastDay = day.target + 2;
  const matches = matcher(rule, e.wall, startDay, interval);

  const out = [];
  let seen = 0;
  for (let n = startDay; n <= lastDay && seen < count; n++) {
    if (n !== startDay && !matches(n)) continue;
    const occ = occurrenceOn(e, n);
    if (untilKey !== null && (e.allDay || until.allDay ? n > (until.allDay ? untilKey : dayOfUtc(untilKey, e.zone)) : occ.key > untilKey)) break;
    seen++;
    if (n >= firstUseful) out.push(occ);
  }
  return out;
}

function occurrenceOn(e, n) {
  if (e.allDay) return { key: n, startDay: n, endDay: n + e.days };
  const startMs = wallToUtc({ ...wallOfDay(n), hh: e.wall.hh, mi: e.wall.mi, ss: e.wall.ss }, e.zone);
  return { key: startMs, startMs, endMs: startMs + e.durationMs };
}

function matcher(rule, wall, startDay, interval) {
  const list = (key) => (rule[key] ? rule[key].split(",").filter(Boolean) : null);
  const byDay = list("BYDAY")?.map((spec) => {
    const m = /^([+-]?\d+)?([A-Z]{2})$/.exec(spec.toUpperCase());
    return m ? { ord: m[1] ? Number(m[1]) : 0, wd: WEEKDAYS.indexOf(m[2]) } : null;
  }).filter((s) => s && s.wd >= 0);
  const byMonthDay = list("BYMONTHDAY")?.map(Number);
  const byMonth = list("BYMONTH")?.map(Number);
  const bySetPos = list("BYSETPOS")?.map(Number);
  const wkst = WEEKDAYS.indexOf((rule.WKST || "MO").toUpperCase());
  const weekStart = (n) => n - ((weekday(n) - wkst + 7) % 7);
  const startWd = weekday(startDay);

  // Does day n match the BYDAY/BYMONTHDAY parts within its month (with BYSETPOS)?
  const inMonth = (n, defaultDay) => {
    const { y, m, d } = wallOfDay(n);
    const dayMatches = (k) => {
      const kw = wallOfDay(k);
      const len = daysInMonth(kw.y, kw.m);
      if (byMonthDay && !byMonthDay.some((md) => (md > 0 ? md : len + md + 1) === kw.d)) return false;
      if (byDay && !byDay.some((s) => s.wd === weekday(k) && ordinalMatches(s.ord, kw.d, len))) return false;
      if (!byMonthDay && !byDay) return kw.d === defaultDay;
      return true;
    };
    if (!bySetPos) return dayMatches(n);
    const first = dayNumber(y, m, 1);
    const set = [];
    for (let k = first; k < first + daysInMonth(y, m); k++) if (dayMatches(k)) set.push(k);
    return bySetPos.some((pos) => set[pos > 0 ? pos - 1 : set.length + pos] === n) && d > 0;
  };

  switch (rule.FREQ.toUpperCase()) {
    case "DAILY":
      return (n) => (n - startDay) % interval === 0
        && (!byMonth || byMonth.includes(wallOfDay(n).m))
        && (!byDay || byDay.some((s) => s.wd === weekday(n)))
        && (!byMonthDay || byMonthDay.includes(wallOfDay(n).d));
    case "WEEKLY":
      return (n) => ((weekStart(n) - weekStart(startDay)) / 7) % interval === 0
        && (!byMonth || byMonth.includes(wallOfDay(n).m))
        && (byDay ? byDay.some((s) => s.wd === weekday(n)) : weekday(n) === startWd);
    case "MONTHLY":
      return (n) => {
        const { y, m } = wallOfDay(n);
        return ((y - wall.y) * 12 + (m - wall.m)) % interval === 0
          && (!byMonth || byMonth.includes(m))
          && inMonth(n, wall.d);
      };
    case "YEARLY":
      return (n) => {
        const { y, m, d } = wallOfDay(n);
        if ((y - wall.y) % interval !== 0) return false;
        if (!(byMonth || [wall.m]).includes(m)) return false;
        return byDay || byMonthDay ? inMonth(n, wall.d) : d === wall.d;
      };
    default:
      return () => false;
  }
}

function ordinalMatches(ord, d, len) {
  if (ord === 0) return true;
  if (ord > 0) return Math.ceil(d / 7) === ord;
  return Math.ceil((len - d + 1) / 7) === -ord;
}

// ---------- dedupe ----------

const RESPONSE_RANK = ["organizer", "accepted", "tentative", "needs-action", "none", "unknown", "declined"];

function dedupe(events) {
  const byKey = new Map();
  for (const e of events) {
    const key = `${e.title.toLowerCase()}|${e.allDay ? `d${e.startDay}` : e.startMs}`;
    const kept = byKey.get(key);
    if (!kept) {
      byKey.set(key, { ...e, calendars: [...e.calendars] });
      continue;
    }
    for (const c of e.calendars) if (!kept.calendars.includes(c)) kept.calendars.push(c);
    if (RESPONSE_RANK.indexOf(e.response) < RESPONSE_RANK.indexOf(kept.response)) kept.response = e.response;
    kept.location ||= e.location;
    kept.free &&= e.free;
  }
  return [...byKey.values()];
}

// ---------- dates and zones ----------

function dayNumber(y, m, d) {
  return Math.floor(Date.UTC(y, m - 1, d) / DAY_MS);
}

function wallOfDay(n) {
  const date = new Date(n * DAY_MS);
  return { y: date.getUTCFullYear(), m: date.getUTCMonth() + 1, d: date.getUTCDate() };
}

function weekday(n) {
  return (((n + 4) % 7) + 7) % 7; // day 0 (1970-01-01) was a Thursday
}

function daysInMonth(y, m) {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

function resolveZone(tzid) {
  const name = tzid.trim();
  if (WINDOWS_ZONES[name]) return WINDOWS_ZONES[name];
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: name });
    return name;
  } catch {
    return null;
  }
}

const formatters = new Map();
function partsIn(ms, zone) {
  if (!formatters.has(zone)) {
    formatters.set(zone, new Intl.DateTimeFormat("en-US", {
      timeZone: zone, hourCycle: "h23",
      year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
    }));
  }
  const p = Object.fromEntries(formatters.get(zone).formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  return { y: +p.year, m: +p.month, d: +p.day, hh: +p.hour % 24, mi: +p.minute, ss: +p.second };
}

function offsetAt(ms, zone) {
  const p = partsIn(ms, zone);
  return Date.UTC(p.y, p.m - 1, p.d, p.hh, p.mi, p.ss) - Math.floor(ms / 1000) * 1000;
}

function wallToUtc(w, zone) {
  const asUtc = Date.UTC(w.y, w.m - 1, w.d, w.hh, w.mi, w.ss);
  if (zone === "UTC") return asUtc;
  let ms = asUtc - offsetAt(asUtc, zone);
  ms = asUtc - offsetAt(ms, zone);
  return ms;
}

function dayOfUtc(ms, zone) {
  const p = partsIn(ms, zone);
  return dayNumber(p.y, p.m, p.d);
}

function todayIn(zone) {
  const p = partsIn(Date.now(), zone);
  return `${p.y}-${String(p.m).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`;
}

function formatTime(ms, zone) {
  return new Intl.DateTimeFormat("en-US", { timeZone: zone, hour: "numeric", minute: "2-digit" }).format(new Date(ms));
}
