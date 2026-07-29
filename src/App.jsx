import React, { useState, useMemo } from "react";
import {
  Plus,
  X,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ExternalLink,
  RotateCcw,
} from "lucide-react";
import { supabase } from "./lib/supabase";
import { useHouseholdState } from "./lib/useHouseholdState";
import AuthGate from "./AuthGate";

/* =========================================================================
   AJ & MELISSA — HOUSEHOLD LEDGER
   Shared. Monochrome. Editorial.
   Categories: Event / Travel / Other
   ========================================================================= */

let _id = 0;
const nid = () => `n${Date.now()}_${_id++}`;

const SEED = {
  version: 3,
  events: {
    "2026-07-04": [{ id: "e1", text: "Pippa's birthday", cat: "event" }],
    "2026-07-08": [{ id: "e2", text: "Elise · 4:30 PM", cat: "other" }],
    "2026-07-10": [{ id: "e3", text: "Rehearsal dinner", cat: "event" }],
    "2026-07-11": [{ id: "e4", text: "Melanie & Alex wedding", cat: "event" }],
    "2026-07-14": [{ id: "e5", text: "Maine · Asticou", cat: "travel", span: 4 }],
    "2026-07-22": [{ id: "e9", text: "Elise · 4:30 PM", cat: "other" }],
    "2026-07-28": [{ id: "e10", text: "Dave East · Gramercy", cat: "event" }],
    "2026-07-29": [{ id: "e11", text: "Elise · 4:30 PM", cat: "other" }],
    "2026-07-30": [{ id: "e12", text: "Flyfish · 7:45 PM", cat: "event" }],
  },
  checklist: [
    { id: "c1", text: "Wedding gift for Alex & Melanie", done: false },
    { id: "c2", text: "Finalize NorCal travel dates & hotel stays", done: false },
    {
      id: "c3",
      text: "Review Zillow rentals",
      link: "https://docs.google.com/document/d/1oMqPd5CWMJ62i6eysFYBksbQGAW9Xe6so0OG0YOO2sg/edit?usp=sharing",
      done: false,
    },
  ],
  reminders: [
    { id: "r1", text: "Call Heart of Chelsea re: Pippa's vaccines", done: false },
  ],
};

/* ---------- tokens ------------------------------------------------------ */

const INK = "#0E1114";
const SLATE = "#5B6470";
const MUTE = "#9AA3AE";
const LINE = "#E4E7EA";
const HAIR = "#EFF1F3";
const PAPER = "#FFFFFF";
const FIELD = "#F7F8F9";
const TINT = "#FAFBFB";

const MONO = "'IBM Plex Mono', ui-monospace, monospace";
const SANS = "'Schibsted Grotesk', -apple-system, 'Helvetica Neue', sans-serif";
const SERIF = "'Instrument Serif', Georgia, serif";

/* three categories, three distinct monochrome textures */
const CATS = ["event", "travel", "other"];
const CAT_LABEL = { event: "Event", travel: "Travel", other: "Other" };

const HATCH = `repeating-linear-gradient(45deg, ${INK} 0 1.5px, transparent 1.5px 5px)`;

const catChip = {
  event: { background: INK, color: "#FFFFFF", border: `1px solid ${INK}` },
  travel: {
    backgroundColor: "#FFFFFF",
    backgroundImage: `repeating-linear-gradient(45deg, #C9CFD5 0 1px, transparent 1px 4px)`,
    color: INK,
    border: `1px solid ${INK}`,
  },
  other: { background: PAPER, color: SLATE, border: `1px solid ${LINE}` },
};

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DOW = ["S", "M", "T", "W", "T", "F", "S"];
const DOW_FULL = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

const dkey = (y, m, d) =>
  `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
const keyOf = (dt) => dkey(dt.getFullYear(), dt.getMonth(), dt.getDate());
const parseKey = (k) => {
  const [y, m, d] = k.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const addDays = (dt, n) => {
  const c = new Date(dt);
  c.setDate(c.getDate() + n);
  return c;
};
const isoWeek = (dt) => {
  const d = new Date(Date.UTC(dt.getFullYear(), dt.getMonth(), dt.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const y0 = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - y0) / 86400000 + 1) / 7);
};
/* old records used `urgency`; anything unclassified reads as an Event */
const catOf = (e) => (CATS.includes(e.cat) ? e.cat : "event");

/* ---------- small pieces ------------------------------------------------ */

const Label = ({ children, style }) => (
  <span
    style={{
      fontFamily: MONO,
      fontSize: 9.5,
      letterSpacing: "0.22em",
      textTransform: "uppercase",
      color: MUTE,
      ...style,
    }}
  >
    {children}
  </span>
);

const CatMark = ({ cat, onClick, size = 9 }) => {
  const base = {
    width: size,
    height: size,
    borderRadius: 2,
    cursor: onClick ? "pointer" : "default",
    padding: 0,
    flexShrink: 0,
    display: "block",
  };
  const styles = {
    event: { ...base, background: INK, border: `1.5px solid ${INK}` },
    travel: {
      ...base,
      backgroundColor: PAPER,
      backgroundImage: HATCH,
      border: `1.5px solid ${INK}`,
    },
    other: { ...base, background: "transparent", border: `1.5px solid #B4BBC3` },
  };
  return (
    <button
      onClick={onClick}
      title={onClick ? `${CAT_LABEL[cat]} — click to change` : CAT_LABEL[cat]}
      style={styles[cat] || styles.other}
    />
  );
};

/* ======================================================================= */

function HouseholdLedger() {
  const { state, setState, error } = useHouseholdState(SEED);
  const today = new Date();
  const todayKey = keyOf(today);

  const [cal, setCal] = useState({ y: today.getFullYear(), m: today.getMonth() });
  const [selected, setSelected] = useState(todayKey);

  const segments = useMemo(() => {
    const map = {};
    Object.entries((state && state.events) || {}).forEach(([key, list]) => {
      (list || []).forEach((e) => {
        const span = Math.max(1, e.span || 1);
        const start = parseKey(key);
        for (let i = 0; i < span; i++) {
          const dt = addDays(start, i);
          const k = keyOf(dt);
          const pos = span === 1 ? "solo" : i === 0 ? "start" : i === span - 1 ? "end" : "mid";
          (map[k] = map[k] || []).push({
            ...e,
            cat: catOf(e),
            pos,
            showText: i === 0 || dt.getDay() === 0,
          });
        }
      });
    });
    return map;
  }, [state]);

  const counts = useMemo(() => {
    if (!state) return { tasks: 0, reminders: 0, month: 0 };
    let month = 0;
    Object.entries(state.events || {}).forEach(([k, list]) => {
      const d = parseKey(k);
      if (d.getFullYear() === cal.y && d.getMonth() === cal.m) month += (list || []).length;
    });
    return {
      tasks: state.checklist.filter((c) => !c.done).length,
      reminders: state.reminders.filter((r) => !r.done).length,
      month,
    };
  }, [state, cal]);

  const nextUp = useMemo(() => {
    if (!state) return null;
    const rows = [];
    Object.entries(state.events || {}).forEach(([key, list]) => {
      (list || []).forEach((e) => rows.push({ key, ...e }));
    });
    const t0 = parseKey(todayKey).getTime();
    const future = rows
      .filter((r) => parseKey(r.key).getTime() >= t0)
      .sort((a, b) => parseKey(a.key) - parseKey(b.key));
    if (!future.length) return null;
    const e = future[0];
    const d = parseKey(e.key);
    const diff = Math.round((d.getTime() - t0) / 86400000);
    const when = diff === 0 ? "Today" : diff === 1 ? "Tomorrow" : `In ${diff} days`;
    const dateline = `${DOW_FULL[d.getDay()].slice(0, 3)} · ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}`;
    return { text: e.text, when, dateline, cat: catOf(e) };
  }, [state, todayKey]);

  const week = useMemo(() => {
    const start = addDays(today, -today.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const dt = addDays(start, i);
      const k = keyOf(dt);
      return { dt, key: k, items: segments[k] || [] };
    });
  }, [segments, todayKey]);

  if (error === "no-household") {
    return (
      <Centered>
        <Label>Almost there</Label>
        <p style={{ fontFamily: SANS, fontSize: 14, color: SLATE, lineHeight: 1.6, marginTop: 12 }}>
          You're signed in, but this email isn't linked to the household yet.
        </p>
      </Centered>
    );
  }

  if (!state) {
    return (
      <Centered>
        <Label style={{ letterSpacing: "0.28em" }}>Loading ledger…</Label>
      </Centered>
    );
  }

  const checklist = state.checklist || [];
  const reminders = state.reminders || [];

  /* ---------- mutations ------------------------------------------------- */

  const patch = (fn) => setState((s) => fn(structuredClone(s)));

  const addEvent = (key, text, cat, span) =>
    patch((s) => {
      s.events[key] = s.events[key] || [];
      s.events[key].push({ id: nid(), text, cat, ...(span > 1 ? { span } : {}) });
      return s;
    });

  const updateEvent = (key, id, changes) =>
    patch((s) => {
      s.events[key] = (s.events[key] || []).map((e) =>
        e.id === id ? { ...e, ...changes } : e
      );
      return s;
    });

  const deleteEvent = (key, id) =>
    patch((s) => {
      s.events[key] = (s.events[key] || []).filter((e) => e.id !== id);
      if (!s.events[key].length) delete s.events[key];
      return s;
    });

  const toggleItem = (list, id) =>
    patch((s) => {
      s[list] = (s[list] || []).map((i) => (i.id === id ? { ...i, done: !i.done } : i));
      return s;
    });

  const addTo = (list, item) =>
    patch((s) => {
      s[list] = [...(s[list] || []), item];
      return s;
    });

  const removeFrom = (list, id) =>
    patch((s) => {
      s[list] = (s[list] || []).filter((i) => i.id !== id);
      return s;
    });

  const goMonth = (dir) =>
    setCal(({ y, m }) => {
      let nm = m + dir, ny = y;
      if (nm < 0) { nm = 11; ny -= 1; }
      if (nm > 11) { nm = 0; ny += 1; }
      return { y: ny, m: nm };
    });

  const goToday = () => {
    setCal({ y: today.getFullYear(), m: today.getMonth() });
    setSelected(todayKey);
  };

  /* ---------- calendar -------------------------------------------------- */

  const firstDow = new Date(cal.y, cal.m, 1).getDay();
  const daysIn = new Date(cal.y, cal.m + 1, 0).getDate();
  const cells = [
    ...Array.from({ length: firstDow }, () => null),
    ...Array.from({ length: daysIn }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const monthHasEvents = counts.month > 0;
  const selDate = parseKey(selected);
  const selNice = `${DOW_FULL[selDate.getDay()]}, ${MONTHS[selDate.getMonth()]} ${selDate.getDate()}`;

  /* ======================================================================= */

  return (
    <div className="min-h-screen" style={{ background: PAPER, color: INK, fontFamily: SANS }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:wght@300;400;500;600;700&family=Instrument+Serif:ital@0;1&family=IBM+Plex+Mono:wght@400;500&display=swap');
        * { -webkit-font-smoothing: antialiased; }
        button:focus-visible, input:focus-visible { outline: 2px solid ${INK}; outline-offset: 2px; }
        input::placeholder { color: ${MUTE}; }
        @media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
        @media print { .no-print { display: none !important; } }
      `}</style>

      <div className="max-w-5xl mx-auto px-5 sm:px-8 pb-20">

        {/* ---------- DATELINE ---------- */}
        <div className="pt-7 pb-2 flex items-center justify-between"
          style={{ borderBottom: `1px solid ${HAIR}` }}>
          <Label>
            {DOW_FULL[today.getDay()]}, {MONTHS[today.getMonth()]} {today.getDate()}, {today.getFullYear()}
          </Label>
          <Label>Week {isoWeek(today)}</Label>
        </div>

        {/* ---------- MASTHEAD ---------- */}
        <header className="pt-8 pb-6">
          <h1 style={{
            fontSize: "clamp(38px, 8vw, 72px)",
            lineHeight: 0.9,
            letterSpacing: "-0.035em",
            fontWeight: 300,
          }}>
            AJ{" "}
            <span style={{ fontFamily: SERIF, fontStyle: "italic", fontWeight: 400 }}>&</span>{" "}
            <span style={{ fontWeight: 600 }}>Melissa</span>
          </h1>
          <Label style={{ letterSpacing: "0.34em", display: "block", marginTop: 12 }}>
            Household ledger
          </Label>
        </header>

        <div style={{ borderTop: `2px solid ${INK}`, marginBottom: 2 }} />
        <div style={{ borderTop: `1px solid ${INK}` }} />

        {/* ---------- NEXT UP — inverted hero ---------- */}
        {nextUp && (
          <div
            className="flex items-end justify-between gap-6 flex-wrap"
            style={{ background: INK, color: PAPER, padding: "22px 22px 20px" }}
          >
            <div className="min-w-0">
              <Label style={{ color: "rgba(255,255,255,.45)" }}>Next up</Label>
              <div
                className="mt-2"
                style={{
                  fontFamily: SERIF,
                  fontSize: "clamp(24px, 4.4vw, 38px)",
                  lineHeight: 1.05,
                  letterSpacing: "-0.01em",
                }}
              >
                {nextUp.text}
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <div style={{ fontFamily: MONO, fontSize: 15, letterSpacing: "0.04em" }}>
                {nextUp.when}
              </div>
              <Label style={{ color: "rgba(255,255,255,.45)", display: "block", marginTop: 5 }}>
                {nextUp.dateline}
              </Label>
            </div>
          </div>
        )}

        {/* ---------- COUNTERS ---------- */}
        <div className="grid grid-cols-3" style={{ borderBottom: `1px solid ${INK}` }}>
          {[
            ["Tasks open", counts.tasks],
            ["Reminders", counts.reminders],
            [`${MONTHS[cal.m].slice(0, 3)} entries`, counts.month],
          ].map(([label, n], i) => (
            <div key={label} className="py-4"
              style={{
                borderLeft: i === 0 ? "none" : `1px solid ${HAIR}`,
                paddingLeft: i === 0 ? 0 : 16,
              }}>
              <div style={{
                fontFamily: MONO, fontSize: 32, lineHeight: 1,
                color: n === 0 ? MUTE : INK,
              }}>
                {String(n).padStart(2, "0")}
              </div>
              <Label style={{ display: "block", marginTop: 7 }}>{label}</Label>
            </div>
          ))}
        </div>

        {/* ---------- THIS WEEK ---------- */}
        <section className="mt-11 no-print">
          <SectionHead numeral="I" title="This week" />
          <div className="grid grid-cols-7 gap-px mt-3" style={{ background: HAIR }}>
            {week.map(({ dt, key, items }) => {
              const isToday = key === todayKey;
              return (
                <button
                  key={key}
                  onClick={() => {
                    setSelected(key);
                    setCal({ y: dt.getFullYear(), m: dt.getMonth() });
                  }}
                  className="text-left"
                  style={{
                    background: isToday ? INK : PAPER,
                    color: isToday ? "#fff" : INK,
                    padding: "10px 8px",
                    minHeight: 88,
                    border: "none",
                    cursor: "pointer",
                    display: "block",
                  }}
                >
                  <div style={{
                    fontFamily: MONO, fontSize: 9, letterSpacing: "0.18em",
                    color: isToday ? "rgba(255,255,255,.55)" : MUTE,
                  }}>
                    {DOW[dt.getDay()]}
                  </div>
                  <div style={{
                    fontFamily: MONO, fontSize: 18, marginTop: 2,
                    color: isToday ? "#fff" : items.length ? INK : MUTE,
                  }}>
                    {dt.getDate()}
                  </div>
                  <div className="mt-2 flex flex-col gap-1">
                    {items.slice(0, 2).map((e, i) => (
                      <div key={e.id + i} className="truncate"
                        style={{
                          fontSize: 9.5, lineHeight: "12px",
                          color: isToday ? "rgba(255,255,255,.85)" : SLATE,
                        }}>
                        {e.showText ? e.text : "·"}
                      </div>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* ---------- BODY ---------- */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 lg:gap-14 mt-12">

          {/* CALENDAR */}
          <section className="lg:col-span-3">

            <div className="flex items-end justify-between">
              <div className="flex items-baseline gap-4">
                <span style={{
                  fontFamily: MONO, fontSize: 46, lineHeight: 0.85,
                  letterSpacing: "-0.04em", color: HAIR,
                }}>
                  {String(cal.m + 1).padStart(2, "0")}
                </span>
                <h2 style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.02em" }}>
                  {MONTHS[cal.m]}{" "}
                  <span style={{ fontFamily: SERIF, fontStyle: "italic", fontWeight: 400, color: SLATE }}>
                    {cal.y}
                  </span>
                </h2>
              </div>
              <div className="flex items-center gap-1 no-print">
                <button onClick={goToday}
                  style={{
                    fontFamily: MONO, fontSize: 9, letterSpacing: "0.18em",
                    textTransform: "uppercase", color: SLATE, background: "none",
                    border: `1px solid ${LINE}`, borderRadius: 2, padding: "4px 9px",
                    cursor: "pointer", marginRight: 4,
                  }}>
                  Today
                </button>
                <button onClick={() => goMonth(-1)} aria-label="Previous month" className="p-2"
                  style={{ color: SLATE, background: "none", border: "none", cursor: "pointer" }}>
                  <ChevronLeft size={16} />
                </button>
                <button onClick={() => goMonth(1)} aria-label="Next month" className="p-2"
                  style={{ color: SLATE, background: "none", border: "none", cursor: "pointer" }}>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 mt-5">
              {DOW.map((d, i) => (
                <div key={i} className="text-center pb-2"
                  style={{ fontFamily: MONO, fontSize: 9, letterSpacing: "0.2em", color: MUTE }}>
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7"
              style={{ borderTop: `1px solid ${LINE}`, borderLeft: `1px solid ${LINE}` }}>
              {cells.map((day, i) => {
                const dowIdx = i % 7;
                const weekend = dowIdx === 0 || dowIdx === 6;
                if (day === null)
                  return (
                    <div key={i} style={{
                      borderRight: `1px solid ${LINE}`, borderBottom: `1px solid ${LINE}`,
                      background: FIELD, minHeight: 84,
                    }} />
                  );
                const key = dkey(cal.y, cal.m, day);
                const evts = segments[key] || [];
                const isSel = key === selected;
                const isToday = key === todayKey;
                return (
                  <button
                    key={i}
                    onClick={() => setSelected(key)}
                    className="text-left align-top"
                    style={{
                      borderRight: `1px solid ${LINE}`,
                      borderBottom: `1px solid ${LINE}`,
                      minHeight: 84,
                      padding: "6px 5px",
                      background: isSel ? FIELD : weekend ? TINT : PAPER,
                      boxShadow: isSel ? `inset 0 0 0 1.5px ${INK}` : "none",
                      cursor: "pointer",
                      display: "block",
                      width: "100%",
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span style={{
                        fontFamily: MONO, fontSize: 10.5,
                        fontWeight: isToday ? 500 : 400,
                        color: evts.length ? INK : MUTE,
                      }}>
                        {String(day).padStart(2, "0")}
                      </span>
                      {isToday && (
                        <span style={{ width: 14, height: 2, background: INK, display: "block", borderRadius: 1 }} />
                      )}
                    </div>

                    <div className="flex gap-1 mt-1.5 sm:hidden flex-wrap">
                      {evts.slice(0, 4).map((e, k) => (
                        <CatMark key={e.id + k} cat={e.cat} size={6} />
                      ))}
                    </div>

                    <div className="hidden sm:flex flex-col gap-1 mt-1.5">
                      {evts.slice(0, 2).map((e, k) => {
                        const s = catChip[e.cat] || catChip.other;
                        const radius =
                          e.pos === "solo" ? "2px" :
                          e.pos === "start" ? "2px 0 0 2px" :
                          e.pos === "end" ? "0 2px 2px 0" : "0";
                        return (
                          <div key={e.id + k} className="truncate"
                            style={{
                              background: s.background,
                              backgroundColor: s.backgroundColor,
                              backgroundImage: s.backgroundImage,
                              color: s.color,
                              borderTop: s.border,
                              borderBottom: s.border,
                              borderLeft: e.pos === "mid" || e.pos === "end" ? "none" : s.border,
                              borderRight: e.pos === "mid" || e.pos === "start" ? "none" : s.border,
                              fontSize: 9.5,
                              lineHeight: "14px",
                              borderRadius: radius,
                              padding: "1px 5px",
                              minHeight: 16,
                              fontWeight: e.cat === "travel" ? 500 : 400,
                            }}>
                            {e.showText ? e.text : "\u00A0"}
                          </div>
                        );
                      })}
                      {evts.length > 2 && (
                        <div style={{ fontFamily: MONO, fontSize: 8.5, color: MUTE }}>
                          +{evts.length - 2}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* legend */}
            <div className="flex items-center gap-6 mt-3">
              {CATS.map((c) => (
                <div key={c} className="flex items-center gap-2">
                  <CatMark cat={c} size={8} />
                  <Label style={{ fontSize: 8.5, letterSpacing: "0.18em" }}>{CAT_LABEL[c]}</Label>
                </div>
              ))}
            </div>

            {!monthHasEvents && (
              <div className="text-center py-9">
                <span style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 20, color: MUTE }}>
                  The month is open.
                </span>
              </div>
            )}

            <DayEditor
              dateKey={selected}
              nice={selNice}
              events={state.events[selected] || []}
              onAdd={addEvent}
              onUpdate={updateEvent}
              onDelete={deleteEvent}
            />
          </section>

          {/* RAIL */}
          <aside className="lg:col-span-2 flex flex-col gap-12">

            <Panel numeral="II" title="Checklist" open={counts.tasks}>
              <ItemGroup
                items={checklist.filter((c) => !c.done)}
                settled={checklist.filter((c) => c.done)}
                renderItem={(c, idx) => (
                  <CheckRow key={c.id} item={c} index={idx}
                    onToggle={() => toggleItem("checklist", c.id)}
                    onDelete={() => removeFrom("checklist", c.id)} />
                )}
              />
              <QuickAdd
                placeholder="New checklist item…"
                onAdd={(text) => addTo("checklist", { id: nid(), text, done: false })}
              />
            </Panel>

            <Panel numeral="III" title="Reminders" open={counts.reminders}>
              <ItemGroup
                items={reminders.filter((r) => !r.done)}
                settled={reminders.filter((r) => r.done)}
                renderItem={(r, idx) => (
                  <CheckRow key={r.id} item={r} index={idx}
                    onToggle={() => toggleItem("reminders", r.id)}
                    onDelete={() => removeFrom("reminders", r.id)} />
                )}
              />
              <QuickAdd
                placeholder="New reminder…"
                onAdd={(text) => addTo("reminders", { id: nid(), text, done: false })}
              />
            </Panel>
          </aside>
        </div>

        {/* ---------- FOOTER ---------- */}
        <footer className="mt-20 pt-5 flex items-center justify-between flex-wrap gap-3 no-print"
          style={{ borderTop: `1px solid ${INK}` }}>
          <div className="flex items-center gap-6">
            <Label>Synced live</Label>
            <button onClick={() => supabase.auth.signOut()}
              style={{
                fontFamily: MONO, fontSize: 9.5, letterSpacing: "0.18em",
                textTransform: "uppercase", color: MUTE, background: "none",
                border: "none", cursor: "pointer", padding: 0,
              }}>
              Sign out
            </button>
          </div>
          <ResetControl onReset={() => setState(structuredClone(SEED))} />
        </footer>
      </div>
    </div>
  );
}

/* ======================================================================= */

export default function App() {
  return (
    <AuthGate>
      <HouseholdLedger />
    </AuthGate>
  );
}

/* ---------- components -------------------------------------------------- */

function Centered({ children }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: PAPER }}>
      <div style={{ maxWidth: 400, textAlign: "center" }}>{children}</div>
    </div>
  );
}

function SectionHead({ numeral, title }) {
  return (
    <div className="flex items-baseline gap-3 pb-2" style={{ borderBottom: `1px solid ${INK}` }}>
      <span style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 16, color: MUTE }}>
        {numeral}.
      </span>
      <h2 style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.005em" }}>{title}</h2>
    </div>
  );
}

function Panel({ numeral, title, open, children }) {
  return (
    <section>
      <div className="flex items-baseline justify-between pb-2" style={{ borderBottom: `1px solid ${INK}` }}>
        <div className="flex items-baseline gap-3">
          <span style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 16, color: MUTE }}>
            {numeral}.
          </span>
          <h2 style={{ fontSize: 16, fontWeight: 600 }}>{title}</h2>
        </div>
        <span style={{ fontFamily: MONO, fontSize: 10, color: MUTE }}>
          {String(open).padStart(2, "0")}
        </span>
      </div>
      {children}
    </section>
  );
}

function ItemGroup({ items, settled, renderItem }) {
  const [showSettled, setShowSettled] = useState(false);
  return (
    <>
      {items.length === 0 && settled.length === 0 && (
        <div className="py-4" style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 15, color: MUTE }}>
          Nothing here yet.
        </div>
      )}
      {items.map((i, idx) => renderItem(i, idx))}

      {settled.length > 0 && (
        <div className="pt-3">
          <button onClick={() => setShowSettled((v) => !v)}
            className="flex items-center gap-2"
            style={{
              fontFamily: MONO, fontSize: 9.5, letterSpacing: "0.18em",
              textTransform: "uppercase", color: MUTE, background: "none",
              border: "none", cursor: "pointer", padding: 0,
            }}>
            <ChevronDown size={12}
              style={{
                transform: showSettled ? "rotate(0deg)" : "rotate(-90deg)",
                transition: "transform 150ms",
              }} />
            Settled ({settled.length})
          </button>
          {showSettled && (
            <div className="mt-1">{settled.map((i, idx) => renderItem(i, idx))}</div>
          )}
        </div>
      )}
    </>
  );
}

function CheckRow({ item, index, onToggle, onDelete }) {
  return (
    <div className="py-3 flex items-start gap-3 group" style={{ borderBottom: `1px solid ${HAIR}` }}>
      <span style={{
        fontFamily: MONO, fontSize: 9, color: MUTE, marginTop: 4,
        minWidth: 16, flexShrink: 0,
      }}>
        {String((index ?? 0) + 1).padStart(2, "0")}
      </span>
      <button onClick={onToggle}
        aria-label={item.done ? "Mark incomplete" : "Mark complete"}
        className="flex-shrink-0 flex items-center justify-center"
        style={{
          width: 16, height: 16, marginTop: 2, borderRadius: 2,
          border: `1.5px solid ${item.done ? INK : "#B4BBC3"}`,
          background: item.done ? INK : "transparent",
          cursor: "pointer", padding: 0,
        }}>
        {item.done && <Check size={11} color="#fff" strokeWidth={3} />}
      </button>
      <div className="flex-1 min-w-0"
        style={{
          fontSize: 14.5, lineHeight: 1.45,
          textDecoration: item.done ? "line-through" : "none",
          textDecorationColor: MUTE,
          opacity: item.done ? 0.38 : 1,
        }}>
        {item.text}
        {item.link && (
          <a href={item.link} target="_blank" rel="noreferrer"
            className="inline-flex items-center ml-2 align-middle" style={{ color: SLATE }}>
            <ExternalLink size={12} />
          </a>
        )}
      </div>
      <button onClick={onDelete} aria-label="Delete item"
        className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 no-print"
        style={{ color: MUTE, background: "none", border: "none", cursor: "pointer", padding: 2 }}>
        <X size={13} />
      </button>
    </div>
  );
}

function QuickAdd({ placeholder, onAdd }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");

  const submit = () => {
    if (!text.trim()) return;
    onAdd(text.trim());
    setText("");
    setOpen(false);
  };

  if (!open)
    return (
      <button onClick={() => setOpen(true)}
        className="flex items-center gap-2 pt-3 no-print"
        style={{
          fontFamily: MONO, fontSize: 9.5, letterSpacing: "0.18em",
          textTransform: "uppercase", color: MUTE, background: "none",
          border: "none", cursor: "pointer",
        }}>
        <Plus size={12} /> Add
      </button>
    );

  return (
    <div className="pt-3 flex items-center gap-2 no-print">
      <input
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
          if (e.key === "Escape") setOpen(false);
        }}
        placeholder={placeholder}
        className="flex-1 min-w-0"
        style={{
          fontFamily: SANS, fontSize: 13.5, padding: "8px 10px",
          border: `1px solid ${LINE}`, borderRadius: 2, background: FIELD, color: INK,
        }}
      />
      <button onClick={submit}
        style={{
          fontFamily: MONO, fontSize: 9.5, letterSpacing: "0.14em",
          padding: "8px 12px", background: INK, color: "#fff",
          border: "none", borderRadius: 2, cursor: "pointer",
        }}>
        SAVE
      </button>
      <button onClick={() => setOpen(false)} aria-label="Cancel"
        style={{ color: MUTE, background: "none", border: "none", cursor: "pointer" }}>
        <X size={14} />
      </button>
    </div>
  );
}

function DayEditor({ dateKey, nice, events, onAdd, onUpdate, onDelete }) {
  const [text, setText] = useState("");
  const [cat, setCat] = useState("event");
  const [span, setSpan] = useState(1);

  const cycle = (c) => CATS[(CATS.indexOf(c) + 1) % CATS.length];

  const submit = () => {
    if (!text.trim()) return;
    onAdd(dateKey, text.trim(), cat, span);
    setText("");
    setSpan(1);
  };

  return (
    <div className="mt-8 p-4 sm:p-5" style={{ background: FIELD, borderRadius: 2 }}>
      <Label>Planning · {nice}</Label>

      <div className="mt-3 flex flex-col gap-2">
        {events.length === 0 && (
          <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 15, color: MUTE }}>
            Nothing planned yet.
          </div>
        )}
        {events.map((e) => {
          const c = catOf(e);
          return (
            <div key={e.id} className="flex items-center gap-3 group py-1">
              <CatMark cat={c} onClick={() => onUpdate(dateKey, e.id, { cat: cycle(c) })} />
              <input
                value={e.text}
                onChange={(ev) => onUpdate(dateKey, e.id, { text: ev.target.value })}
                className="flex-1 min-w-0"
                style={{
                  fontFamily: SANS, fontSize: 13.5, background: "transparent",
                  border: "none", borderBottom: "1px solid transparent",
                  color: INK, padding: "2px 0",
                }}
                onFocus={(ev) => (ev.target.style.borderBottom = `1px solid ${LINE}`)}
                onBlur={(ev) => (ev.target.style.borderBottom = "1px solid transparent")}
              />
              {e.span > 1 && (
                <Label style={{ fontSize: 8.5, whiteSpace: "nowrap" }}>{e.span} days</Label>
              )}
              <button onClick={() => onDelete(dateKey, e.id)} aria-label="Delete event"
                className="opacity-0 group-hover:opacity-100 transition-opacity no-print"
                style={{ color: MUTE, background: "none", border: "none", cursor: "pointer", padding: 2 }}>
                <X size={13} />
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex items-center gap-2 flex-wrap no-print">
        <CatMark cat={cat} onClick={() => setCat(cycle(cat))} size={12} />
        <Label style={{ fontSize: 8.5, minWidth: 42 }}>{CAT_LABEL[cat]}</Label>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Add to this day…"
          className="flex-1"
          style={{
            fontFamily: SANS, fontSize: 13.5, padding: "8px 10px",
            border: `1px solid ${LINE}`, borderRadius: 2, background: PAPER,
            minWidth: 140, color: INK,
          }}
        />
        <div className="flex items-center gap-1.5">
          <Label style={{ fontSize: 8.5 }}>Days</Label>
          <input
            type="number"
            min={1}
            max={30}
            value={span}
            onChange={(e) => setSpan(Math.max(1, Math.min(30, Number(e.target.value) || 1)))}
            style={{
              fontFamily: MONO, fontSize: 12, width: 46, padding: "7px 6px",
              border: `1px solid ${LINE}`, borderRadius: 2, background: PAPER,
              color: INK, textAlign: "center",
            }}
          />
        </div>
        <button onClick={submit}
          style={{
            fontFamily: MONO, fontSize: 9.5, letterSpacing: "0.14em",
            padding: "8px 12px", background: INK, color: "#fff",
            border: "none", borderRadius: 2, cursor: "pointer",
          }}>
          ADD
        </button>
      </div>
    </div>
  );
}

function ResetControl({ onReset }) {
  const [confirm, setConfirm] = useState(false);
  if (!confirm)
    return (
      <button onClick={() => setConfirm(true)}
        className="flex items-center gap-2"
        style={{
          fontFamily: MONO, fontSize: 9.5, letterSpacing: "0.18em",
          textTransform: "uppercase", color: MUTE, background: "none",
          border: "none", cursor: "pointer",
        }}>
        <RotateCcw size={11} /> Reset
      </button>
    );
  return (
    <div className="flex items-center gap-3">
      <span style={{ fontFamily: MONO, fontSize: 10, color: SLATE }}>Restore original data?</span>
      <button onClick={onReset}
        style={{
          fontFamily: MONO, fontSize: 9.5, letterSpacing: "0.14em", color: "#fff",
          background: INK, border: "none", padding: "5px 12px", borderRadius: 2, cursor: "pointer",
        }}>
        CONFIRM
      </button>
      <button onClick={() => setConfirm(false)}
        style={{ fontFamily: MONO, fontSize: 9.5, color: MUTE, background: "none", border: "none", cursor: "pointer" }}>
        CANCEL
      </button>
    </div>
  );
}
