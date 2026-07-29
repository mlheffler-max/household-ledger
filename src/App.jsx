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
   Shared-only model. Everything belongs to both of you.
   Monochrome: white / slate / charcoal. Editorial structure.
   ========================================================================= */

let _id = 0;
const nid = () => `n${Date.now()}_${_id++}`;

const SEED = {
  version: 2,
  events: {
    "2026-07-04": [{ id: "e1", text: "Pippa's birthday", urgency: "med" }],
    "2026-07-08": [{ id: "e2", text: "Elise · 4:30 PM", urgency: "low" }],
    "2026-07-10": [{ id: "e3", text: "Rehearsal dinner", urgency: "high" }],
    "2026-07-11": [{ id: "e4", text: "Melanie & Alex wedding", urgency: "high" }],
    "2026-07-14": [{ id: "e5", text: "Maine · Asticou", urgency: "high", span: 4 }],
    "2026-07-22": [{ id: "e9", text: "Elise · 4:30 PM", urgency: "low" }],
    "2026-07-28": [{ id: "e10", text: "Dave East · Gramercy", urgency: "med" }],
    "2026-07-29": [{ id: "e11", text: "Elise · 4:30 PM", urgency: "low" }],
    "2026-07-30": [{ id: "e12", text: "Flyfish · 7:45 PM", urgency: "med" }],
  },
  decisions: [
    { id: "d1", category: "Scheduling", text: "Aunt Nancy — Babylon this weekend?", answer: null },
    { id: "d2", category: "Scheduling", text: "Melanie — dinner in the next few weeks?", answer: null },
    {
      id: "d3",
      category: "Document",
      text: "Review Zillow rentals",
      link: "https://docs.google.com/document/d/1oMqPd5CWMJ62i6eysFYBksbQGAW9Xe6so0OG0YOO2sg/edit?usp=sharing",
      answer: null,
    },
  ],
  checklist: [
    { id: "c1", text: "Wedding gift for Alex & Melanie", done: false },
    { id: "c2", text: "Finalize NorCal travel dates & hotel stays", done: false },
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

const MONO = "'IBM Plex Mono', ui-monospace, monospace";
const SANS = "'Schibsted Grotesk', -apple-system, 'Helvetica Neue', sans-serif";
const SERIF = "'Instrument Serif', Georgia, serif";

const URGENCY = ["low", "med", "high"];
const chipStyle = {
  low: { background: PAPER, border: `1px solid ${LINE}`, color: SLATE },
  med: { background: "#E9ECEF", border: "1px solid #DFE3E7", color: "#39414A" },
  high: { background: INK, border: `1px solid ${INK}`, color: "#FFFFFF" },
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

/* ---------- shared bits ------------------------------------------------- */

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

const Dot = ({ level, onClick, size = 9 }) => {
  const fill = level === "high" ? INK : level === "med" ? "#B4BBC3" : "transparent";
  return (
    <button
      onClick={onClick}
      title={onClick ? `Urgency: ${level} — click to change` : `Urgency: ${level}`}
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        background: fill,
        border: `1.5px solid ${level === "low" ? "#B4BBC3" : fill}`,
        cursor: onClick ? "pointer" : "default",
        padding: 0,
        flexShrink: 0,
      }}
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
            rootKey: key,
            pos,
            showText: i === 0 || dt.getDay() === 0,
          });
        }
      });
    });
    return map;
  }, [state]);

  const counts = useMemo(() => {
    if (!state) return { questions: 0, tasks: 0, reminders: 0 };
    return {
      questions: state.decisions.filter((d) => d.answer === null).length,
      tasks: state.checklist.filter((c) => !c.done).length,
      reminders: state.reminders.filter((r) => !r.done).length,
    };
  }, [state]);

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
    const diff = Math.round((parseKey(e.key).getTime() - t0) / 86400000);
    const when = diff === 0 ? "today" : diff === 1 ? "tomorrow" : `in ${diff} days`;
    return { text: e.text, when };
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
          Run the membership query in Supabase, then refresh.
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

  /* ---------- mutations ------------------------------------------------- */

  const patch = (fn) => setState((s) => fn(structuredClone(s)));

  const addEvent = (key, text, urgency, span) =>
    patch((s) => {
      s.events[key] = s.events[key] || [];
      s.events[key].push({ id: nid(), text, urgency, ...(span > 1 ? { span } : {}) });
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

  const answerDecision = (id, ans) =>
    patch((s) => {
      s.decisions = s.decisions.map((d) =>
        d.id === id ? { ...d, answer: d.answer === ans ? null : ans } : d
      );
      return s;
    });

  const toggleItem = (list, id) =>
    patch((s) => {
      s[list] = s[list].map((i) => (i.id === id ? { ...i, done: !i.done } : i));
      return s;
    });

  const addTo = (list, item) =>
    patch((s) => {
      s[list] = [...s[list], item];
      return s;
    });

  const removeFrom = (list, id) =>
    patch((s) => {
      s[list] = s[list].filter((i) => i.id !== id);
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

  /* ---------- calendar cells ------------------------------------------- */

  const firstDow = new Date(cal.y, cal.m, 1).getDay();
  const daysIn = new Date(cal.y, cal.m + 1, 0).getDate();
  const cells = [
    ...Array.from({ length: firstDow }, () => null),
    ...Array.from({ length: daysIn }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const monthHasEvents = cells.some(
    (d) => d !== null && (segments[dkey(cal.y, cal.m, d)] || []).length
  );

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
        @media print {
          .no-print { display: none !important; }
          body { background: #fff; }
        }
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
        <header className="pt-7 pb-5">
          <h1 style={{
            fontSize: "clamp(34px, 7vw, 60px)",
            lineHeight: 0.95,
            letterSpacing: "-0.03em",
            fontWeight: 300,
          }}>
            AJ{" "}
            <span style={{ fontFamily: SERIF, fontStyle: "italic", fontWeight: 400 }}>&</span>{" "}
            <span style={{ fontWeight: 600 }}>Melissa</span>
          </h1>
          <div className="mt-3 flex items-baseline justify-between flex-wrap gap-3">
            <Label style={{ letterSpacing: "0.3em" }}>Household ledger</Label>
            {nextUp && (
              <div style={{ fontSize: 13, color: SLATE }}>
                <Label style={{ marginRight: 8 }}>Next</Label>
                {nextUp.text}
                <span style={{ fontFamily: SERIF, fontStyle: "italic", color: MUTE }}>
                  {" "}— {nextUp.when}
                </span>
              </div>
            )}
          </div>
        </header>

        {/* double rule */}
        <div style={{ borderTop: `2px solid ${INK}`, marginBottom: 2 }} />
        <div style={{ borderTop: `1px solid ${INK}` }} />

        {/* ---------- COUNTERS ---------- */}
        <div className="grid grid-cols-3" style={{ borderBottom: `1px solid ${INK}` }}>
          {[
            ["Questions", counts.questions],
            ["Tasks", counts.tasks],
            ["Reminders", counts.reminders],
          ].map(([label, n], i) => (
            <div key={label} className="py-4"
              style={{
                borderLeft: i === 0 ? "none" : `1px solid ${HAIR}`,
                paddingLeft: i === 0 ? 0 : 16,
              }}>
              <div style={{
                fontFamily: MONO, fontSize: 30, lineHeight: 1,
                color: n === 0 ? MUTE : INK,
              }}>
                {String(n).padStart(2, "0")}
              </div>
              <Label style={{ display: "block", marginTop: 6 }}>{label} open</Label>
            </div>
          ))}
        </div>

        {/* ---------- THIS WEEK ---------- */}
        <section className="mt-10 no-print">
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
                    minHeight: 86,
                    border: "none",
                    cursor: "pointer",
                    display: "block",
                  }}
                >
                  <div style={{
                    fontFamily: MONO, fontSize: 9, letterSpacing: "0.18em",
                    color: isToday ? "rgba(255,255,255,.6)" : MUTE,
                  }}>
                    {DOW[dt.getDay()]}
                  </div>
                  <div style={{
                    fontFamily: MONO, fontSize: 17, marginTop: 2,
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
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 lg:gap-12 mt-12">

          {/* CALENDAR */}
          <section className="lg:col-span-3">
            <div className="flex items-baseline justify-between">
              <h2 style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.015em" }}>
                {MONTHS[cal.m]}{" "}
                <span style={{ fontFamily: SERIF, fontStyle: "italic", fontWeight: 400, color: SLATE }}>
                  {cal.y}
                </span>
              </h2>
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
                if (day === null)
                  return (
                    <div key={i} style={{
                      borderRight: `1px solid ${LINE}`, borderBottom: `1px solid ${LINE}`,
                      background: FIELD, minHeight: 82,
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
                      minHeight: 82,
                      padding: "6px 5px",
                      background: isSel ? FIELD : PAPER,
                      boxShadow: isSel ? `inset 0 0 0 1.5px ${INK}` : "none",
                      cursor: "pointer",
                      display: "block",
                      width: "100%",
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span style={{
                        fontFamily: MONO, fontSize: 10.5,
                        color: evts.length ? INK : MUTE,
                      }}>
                        {day}
                      </span>
                      {isToday && (
                        <span style={{ width: 14, height: 2, background: INK, display: "block", borderRadius: 1 }} />
                      )}
                    </div>

                    <div className="flex gap-1 mt-1.5 sm:hidden flex-wrap">
                      {evts.slice(0, 4).map((e, k) => (
                        <Dot key={e.id + k} level={e.urgency} size={5} />
                      ))}
                    </div>

                    <div className="hidden sm:flex flex-col gap-1 mt-1.5">
                      {evts.slice(0, 2).map((e, k) => {
                        const s = chipStyle[e.urgency] || chipStyle.low;
                        const radius =
                          e.pos === "solo" ? "2px" :
                          e.pos === "start" ? "2px 0 0 2px" :
                          e.pos === "end" ? "0 2px 2px 0" : "0";
                        return (
                          <div key={e.id + k} className="truncate"
                            style={{
                              background: s.background,
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

            <div className="flex items-center gap-5 mt-3">
              {URGENCY.map((u) => (
                <div key={u} className="flex items-center gap-2">
                  <Dot level={u} size={7} />
                  <Label style={{ fontSize: 8.5, letterSpacing: "0.18em" }}>
                    {u === "med" ? "medium" : u}
                  </Label>
                </div>
              ))}
            </div>

            {!monthHasEvents && (
              <div className="text-center py-8">
                <span style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 19, color: MUTE }}>
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
          <aside className="lg:col-span-2 flex flex-col gap-11">

            <Panel numeral="II" title="Needs an answer" open={counts.questions}>
              <ItemGroup
                items={state.decisions.filter((d) => d.answer === null)}
                settled={state.decisions.filter((d) => d.answer !== null)}
                renderItem={(d, isSettled) => (
                  <DecisionRow key={d.id} d={d} settled={isSettled} onAnswer={answerDecision} />
                )}
              />
              <QuickAdd
                placeholder="New question…"
                onAdd={(text) =>
                  addTo("decisions", { id: nid(), category: "Scheduling", text, answer: null })
                }
              />
            </Panel>

            <Panel numeral="III" title="Checklist" open={counts.tasks}>
              <ItemGroup
                items={state.checklist.filter((c) => !c.done)}
                settled={state.checklist.filter((c) => c.done)}
                renderItem={(c) => (
                  <CheckRow key={c.id} item={c}
                    onToggle={() => toggleItem("checklist", c.id)}
                    onDelete={() => removeFrom("checklist", c.id)} />
                )}
              />
              <QuickAdd
                placeholder="New checklist item…"
                onAdd={(text) => addTo("checklist", { id: nid(), text, done: false })}
              />
            </Panel>

            <Panel numeral="IV" title="Reminders" open={counts.reminders}>
              <ItemGroup
                items={state.reminders.filter((r) => !r.done)}
                settled={state.reminders.filter((r) => r.done)}
                renderItem={(r) => (
                  <CheckRow key={r.id} item={r}
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
      <span style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 15, color: MUTE }}>
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
          <span style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 15, color: MUTE }}>
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
      {items.map((i) => renderItem(i, false))}

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
          {showSettled && <div className="mt-1">{settled.map((i) => renderItem(i, true))}</div>}
        </div>
      )}
    </>
  );
}

function DecisionRow({ d, settled, onAnswer }) {
  return (
    <div className="py-3 flex items-start justify-between gap-3" style={{ borderBottom: `1px solid ${HAIR}` }}>
      <div className="min-w-0">
        <Label style={{ fontSize: 8.5 }}>{d.category}</Label>
        <div className="mt-1"
          style={{
            fontSize: 14.5,
            lineHeight: 1.45,
            textDecoration: settled ? "line-through" : "none",
            textDecorationColor: MUTE,
            opacity: settled ? 0.38 : 1,
          }}>
          {d.text}
          {d.link && (
            <a href={d.link} target="_blank" rel="noreferrer"
              className="inline-flex items-center ml-2 align-middle" style={{ color: SLATE }}>
              <ExternalLink size={12} />
            </a>
          )}
        </div>
      </div>
      <div className="flex gap-1 flex-shrink-0 pt-1">
        {["yes", "no"].map((a) => {
          const active = d.answer === a;
          return (
            <button key={a} onClick={() => onAnswer(d.id, a)}
              style={{
                fontFamily: MONO, fontSize: 9, letterSpacing: "0.16em",
                textTransform: "uppercase", padding: "5px 10px",
                border: `1px solid ${active ? INK : LINE}`,
                background: active ? INK : "transparent",
                color: active ? "#fff" : SLATE,
                borderRadius: 2, cursor: "pointer",
              }}>
              {a}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CheckRow({ item, onToggle, onDelete }) {
  return (
    <div className="py-3 flex items-start gap-3 group" style={{ borderBottom: `1px solid ${HAIR}` }}>
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
  const [urgency, setUrgency] = useState("low");
  const [span, setSpan] = useState(1);

  const cycle = (u) => URGENCY[(URGENCY.indexOf(u) + 1) % URGENCY.length];

  const submit = () => {
    if (!text.trim()) return;
    onAdd(dateKey, text.trim(), urgency, span);
    setText("");
    setSpan(1);
  };

  return (
    <div className="mt-7 p-4 sm:p-5" style={{ background: FIELD, borderRadius: 2 }}>
      <Label>Planning · {nice}</Label>

      <div className="mt-3 flex flex-col gap-2">
        {events.length === 0 && (
          <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 15, color: MUTE }}>
            Nothing planned yet.
          </div>
        )}
        {events.map((e) => (
          <div key={e.id} className="flex items-center gap-3 group py-1">
            <Dot level={e.urgency} onClick={() => onUpdate(dateKey, e.id, { urgency: cycle(e.urgency) })} />
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
        ))}
      </div>

      <div className="mt-4 flex items-center gap-2 flex-wrap no-print">
        <Dot level={urgency} onClick={() => setUrgency(cycle(urgency))} size={11} />
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Add to this day…"
          className="flex-1"
          style={{
            fontFamily: SANS, fontSize: 13.5, padding: "8px 10px",
            border: `1px solid ${LINE}`, borderRadius: 2, background: PAPER,
            minWidth: 150, color: INK,
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
