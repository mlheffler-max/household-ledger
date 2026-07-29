import React, { useState, useMemo } from "react";
import {
  Plus,
  X,
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  RotateCcw,
} from "lucide-react";

import { supabase } from "./lib/supabase";
import { useHouseholdState } from "./lib/useHouseholdState";
import AuthGate from "./AuthGate";

/* =========================================================================
   AJ & MELISSA — HOUSEHOLD LEDGER  ·  Supabase live-sync edition
   Corporate-minimal shared dashboard. Monochrome: white / slate / charcoal.

   ARCHITECTURE
   ---------------------------------------------------------------
   AuthGate            → magic-link sign-in (each of you uses your own email)
   useHouseholdState   → loads the shared `households.state` row, saves
                         edits (debounced), and subscribes to realtime
                         UPDATEs so each person sees the other's changes
                         within ~1 second, on any device.
   This file           → pure UI. It never talks to the network directly;
                         it just reads `state` and calls `setState`.
   ========================================================================= */

/* ---------- seed data (from the July doc) ------------------------------ */

let _id = 0;
const nid = () => `n${Date.now()}_${_id++}`;

const SEED = {
  version: 1,
  events: {
    "2026-07-04": [{ id: "e1", text: "Pippa's birthday", who: "both", urgency: "med" }],
    "2026-07-08": [{ id: "e2", text: "Elise · 4:30 PM", who: "mel", urgency: "low" }],
    "2026-07-10": [{ id: "e3", text: "Melanie & Alex rehearsal dinner", who: "both", urgency: "high" }],
    "2026-07-11": [{ id: "e4", text: "Melanie & Alex wedding", who: "both", urgency: "high" }],
    "2026-07-14": [{ id: "e5", text: "Travel LGA → BGR · check in, Asticou (Maine)", who: "both", urgency: "high" }],
    "2026-07-15": [{ id: "e6", text: "In Maine", who: "both", urgency: "low" }],
    "2026-07-16": [{ id: "e7", text: "In Maine", who: "both", urgency: "low" }],
    "2026-07-17": [{ id: "e8", text: "Travel BGR → LGA · check out, Asticou", who: "both", urgency: "high" }],
    "2026-07-22": [{ id: "e9", text: "Elise · 4:30 PM", who: "mel", urgency: "low" }],
    "2026-07-28": [{ id: "e10", text: "Dave East · Gramercy Theatre", who: "aj", urgency: "med" }],
    "2026-07-29": [{ id: "e11", text: "Elise · 4:30 PM", who: "mel", urgency: "low" }],
    "2026-07-30": [{ id: "e12", text: "Dinner w/ Alex & Melanie · Flyfish, 7:45 PM", who: "both", urgency: "med" }],
  },
  decisions: [
    {
      id: "d1",
      category: "Scheduling",
      who: "aj",
      text: "Aunt Nancy — free to go to Babylon this weekend?",
      answer: null,
    },
    {
      id: "d2",
      category: "Scheduling",
      who: "aj",
      text: "Melanie — available for dinner in the next few weeks? If so, when?",
      answer: null,
    },
    {
      id: "d3",
      category: "Document",
      who: "aj",
      text: "Review Zillow rentals",
      link: "https://docs.google.com/document/d/1oMqPd5CWMJ62i6eysFYBksbQGAW9Xe6so0OG0YOO2sg/edit?usp=sharing",
      answer: null,
    },
  ],
  checklist: [
    { id: "c1", text: "Wedding gift for Alex & Melanie", who: "both", done: false },
    { id: "c2", text: "Finalize NorCal travel dates & hotel stays", who: "both", done: false },
    {
      id: "c3",
      text: "Review Zillow rentals",
      who: "aj",
      done: false,
      link: "https://docs.google.com/document/d/1oMqPd5CWMJ62i6eysFYBksbQGAW9Xe6so0OG0YOO2sg/edit?usp=sharing",
    },
  ],
  reminders: [
    { id: "r1", text: "Call Heart of Chelsea to confirm Pippa's vax needs", who: "both", done: false },
  ],
};

/* ---------- design tokens ---------------------------------------------- */

const INK = "#111418"; // deep charcoal
const SLATE = "#5B6470"; // mid slate
const MUTE = "#98A1AC"; // quiet slate
const LINE = "#E6E8EB"; // hairline
const PAPER = "#FFFFFF";
const FIELD = "#F7F8F9"; // faint surface

const MONO = "'IBM Plex Mono', ui-monospace, monospace";
const SANS = "'Schibsted Grotesk', -apple-system, 'Helvetica Neue', sans-serif";
const SERIF = "'Instrument Serif', Georgia, serif";

const URGENCY = ["low", "med", "high"];
const urgencyStyle = {
  low: { background: PAPER, border: `1px solid ${LINE}`, color: SLATE },
  med: { background: "#EDEFF2", border: "1px solid #E0E3E7", color: "#3A424C" },
  high: { background: INK, border: `1px solid ${INK}`, color: "#FFFFFF" },
};

const WHO = ["aj", "mel", "both"];
const whoLabel = { aj: "AJ", mel: "M", both: "A+M" };
const whoLong = { aj: "AJ", mel: "Melissa", both: "Both" };

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const DOW = ["S", "M", "T", "W", "T", "F", "S"];

const dkey = (y, m, d) =>
  `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

/* ---------- tiny shared pieces ------------------------------------------ */

const Label = ({ children, style }) => (
  <div
    style={{
      fontFamily: MONO,
      fontSize: 10,
      letterSpacing: "0.22em",
      textTransform: "uppercase",
      color: MUTE,
      ...style,
    }}
  >
    {children}
  </div>
);

const WhoTag = ({ who }) => (
  <span
    style={{
      fontFamily: MONO,
      fontSize: 9,
      letterSpacing: "0.14em",
      color: who === "both" ? MUTE : SLATE,
      border: `1px solid ${LINE}`,
      borderRadius: 999,
      padding: "1px 7px",
      whiteSpace: "nowrap",
    }}
  >
    {whoLabel[who]}
  </span>
);

const WhoPicker = ({ value, onChange }) => (
  <div className="flex" style={{ border: `1px solid ${LINE}`, borderRadius: 999, overflow: "hidden" }}>
    {WHO.map((w) => (
      <button
        key={w}
        onClick={() => onChange(w)}
        style={{
          fontFamily: MONO,
          fontSize: 9,
          letterSpacing: "0.1em",
          padding: "3px 8px",
          background: value === w ? INK : "transparent",
          color: value === w ? "#fff" : MUTE,
          border: "none",
          cursor: "pointer",
        }}
      >
        {whoLabel[w]}
      </button>
    ))}
  </div>
);

const UrgencyDot = ({ level, onClick, size = 9 }) => {
  const fill = level === "high" ? INK : level === "med" ? "#B6BDC6" : "transparent";
  return (
    <button
      onClick={onClick}
      title={`Urgency: ${level}${onClick ? " (click to change)" : ""}`}
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        background: fill,
        border: `1.5px solid ${level === "low" ? "#B6BDC6" : fill}`,
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
  const [view, setView] = useState("all"); // 'aj' | 'mel' | 'all'
  const [cal, setCal] = useState({ y: 2026, m: 6 }); // July 2026
  const [selected, setSelected] = useState("2026-07-14");
  const [confirmReset, setConfirmReset] = useState(false);

  if (error === "no-household") {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ background: PAPER }}>
        <div style={{ maxWidth: 420, textAlign: "center" }}>
          <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.22em", color: MUTE }}>
            ALMOST THERE
          </div>
          <p style={{ fontFamily: SANS, fontSize: 14, color: SLATE, lineHeight: 1.6, marginTop: 12 }}>
            You're signed in, but this email isn't a member of the household yet.
            Run step 6 of the setup guide (the membership SQL) once, then refresh.
          </p>
        </div>
      </div>
    );
  }

  const inView = (who) => view === "all" || who === view || who === "both";

  /* completion metric — everything that can be "settled" */
  const metric = useMemo(() => {
    if (!state) return { pct: 0, done: 0, total: 0 };
    const items = [
      ...state.decisions.filter((d) => inView(d.who)),
      ...state.checklist.filter((c) => inView(c.who)),
      ...state.reminders.filter((r) => inView(r.who)),
    ];
    const done = items.filter((i) => ("answer" in i ? i.answer !== null : i.done)).length;
    const total = items.length;
    return { pct: total ? Math.round((done / total) * 100) : 0, done, total };
  }, [state, view]);

  if (!state) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: PAPER }}>
        <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.2em", color: MUTE }}>
          LOADING LEDGER…
        </div>
      </div>
    );
  }

  /* ---------- mutations -------------------------------------------------- */

  const patch = (fn) => setState((s) => fn(structuredClone(s)));

  const addEvent = (key, text, who, urgency) =>
    patch((s) => {
      s.events[key] = s.events[key] || [];
      s.events[key].push({ id: nid(), text, who, urgency });
      return s;
    });

  const updateEvent = (key, id, changes) =>
    patch((s) => {
      s.events[key] = (s.events[key] || []).map((e) => (e.id === id ? { ...e, ...changes } : e));
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

  const resetAll = () => {
    setState(structuredClone(SEED)); // hook persists + broadcasts to the other device
    setConfirmReset(false);
  };

  /* ---------- calendar math ---------------------------------------------- */

  const firstDow = new Date(cal.y, cal.m, 1).getDay();
  const daysIn = new Date(cal.y, cal.m + 1, 0).getDate();
  const cells = [
    ...Array.from({ length: firstDow }, () => null),
    ...Array.from({ length: daysIn }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const goMonth = (dir) =>
    setCal(({ y, m }) => {
      let nm = m + dir, ny = y;
      if (nm < 0) { nm = 11; ny -= 1; }
      if (nm > 11) { nm = 0; ny += 1; }
      return { y: ny, m: nm };
    });

  const selEvents = (state.events[selected] || []).filter((e) => inView(e.who));

  /* ======================================================================= */

  return (
    <div className="min-h-screen" style={{ background: PAPER, color: INK, fontFamily: SANS }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&family=IBM+Plex+Mono:wght@400;500&display=swap');
        * { -webkit-font-smoothing: antialiased; }
        button:focus-visible, input:focus-visible { outline: 2px solid ${INK}; outline-offset: 2px; }
        input::placeholder { color: ${MUTE}; }
        @media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
      `}</style>

      <div className="max-w-5xl mx-auto px-5 sm:px-8 pb-16">

        {/* ============ MASTHEAD ============ */}
        <header className="pt-10 pb-6" style={{ borderBottom: `1px solid ${INK}` }}>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <Label>Household ledger · est. 2026</Label>
              <h1
                className="mt-2"
                style={{ fontSize: "clamp(28px, 5vw, 44px)", fontWeight: 600, letterSpacing: "-0.02em", lineHeight: 1 }}
              >
                AJ{" "}
                <span style={{ fontFamily: SERIF, fontStyle: "italic", fontWeight: 400 }}>&</span>{" "}
                Melissa
              </h1>
            </div>

            {/* view toggle */}
            <div
              role="tablist"
              aria-label="Filter by person"
              className="flex"
              style={{ border: `1px solid ${INK}`, borderRadius: 2 }}
            >
              {[
                ["aj", "His"],
                ["mel", "Hers"],
                ["all", "Shared"],
              ].map(([v, label]) => (
                <button
                  key={v}
                  role="tab"
                  aria-selected={view === v}
                  onClick={() => setView(v)}
                  className="transition-colors"
                  style={{
                    fontFamily: MONO,
                    fontSize: 10,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    padding: "9px 16px",
                    background: view === v ? INK : "transparent",
                    color: view === v ? "#fff" : SLATE,
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* completion metric */}
          <div className="mt-6 flex items-center gap-4">
            <div style={{ fontFamily: MONO, fontSize: 11, color: INK, minWidth: 38 }}>
              {metric.pct}%
            </div>
            <div className="flex-1" style={{ height: 2, background: LINE }}>
              <div
                className="transition-all"
                style={{ height: 2, width: `${metric.pct}%`, background: INK, transitionDuration: "500ms" }}
              />
            </div>
            <Label style={{ letterSpacing: "0.14em" }}>
              {metric.done} of {metric.total} settled
            </Label>
          </div>
        </header>

        {/* ============ BODY GRID ============ */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 mt-10">

          {/* ---------- CALENDAR (3/5) ---------- */}
          <section className="lg:col-span-3">
            <div className="flex items-baseline justify-between">
              <h2 style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.01em" }}>
                {MONTHS[cal.m]}{" "}
                <span style={{ fontFamily: SERIF, fontStyle: "italic", color: SLATE, fontWeight: 400 }}>
                  {cal.y}
                </span>
              </h2>
              <div className="flex items-center gap-1">
                <button onClick={() => goMonth(-1)} aria-label="Previous month"
                  className="p-2" style={{ color: SLATE, background: "none", border: "none", cursor: "pointer" }}>
                  <ChevronLeft size={16} />
                </button>
                <button onClick={() => goMonth(1)} aria-label="Next month"
                  className="p-2" style={{ color: SLATE, background: "none", border: "none", cursor: "pointer" }}>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            {/* dow header */}
            <div className="grid grid-cols-7 mt-4">
              {DOW.map((d, i) => (
                <div key={i} className="text-center pb-2"
                  style={{ fontFamily: MONO, fontSize: 9, letterSpacing: "0.2em", color: MUTE }}>
                  {d}
                </div>
              ))}
            </div>

            {/* grid */}
            <div className="grid grid-cols-7" style={{ borderTop: `1px solid ${LINE}`, borderLeft: `1px solid ${LINE}` }}>
              {cells.map((day, i) => {
                if (day === null)
                  return <div key={i} style={{ borderRight: `1px solid ${LINE}`, borderBottom: `1px solid ${LINE}`, background: FIELD, minHeight: 74 }} />;
                const key = dkey(cal.y, cal.m, day);
                const evts = (state.events[key] || []).filter((e) => inView(e.who));
                const isSel = key === selected;
                return (
                  <button
                    key={i}
                    onClick={() => setSelected(key)}
                    className="text-left align-top transition-colors"
                    style={{
                      borderRight: `1px solid ${LINE}`,
                      borderBottom: `1px solid ${LINE}`,
                      minHeight: 74,
                      padding: 6,
                      background: isSel ? FIELD : PAPER,
                      boxShadow: isSel ? `inset 0 0 0 1.5px ${INK}` : "none",
                      cursor: "pointer",
                      display: "block",
                      width: "100%",
                    }}
                  >
                    <div style={{ fontFamily: MONO, fontSize: 10, color: evts.length ? INK : MUTE }}>
                      {day}
                    </div>
                    {/* mobile: dots; desktop: chips */}
                    <div className="flex gap-1 mt-1 sm:hidden flex-wrap">
                      {evts.slice(0, 4).map((e) => (
                        <UrgencyDot key={e.id} level={e.urgency} size={6} />
                      ))}
                    </div>
                    <div className="hidden sm:flex flex-col gap-1 mt-1">
                      {evts.slice(0, 2).map((e) => (
                        <div key={e.id} className="truncate"
                          style={{ ...urgencyStyle[e.urgency], fontSize: 10, lineHeight: "14px", borderRadius: 2, padding: "1px 5px" }}>
                          {e.text}
                        </div>
                      ))}
                      {evts.length > 2 && (
                        <div style={{ fontFamily: MONO, fontSize: 9, color: MUTE }}>+{evts.length - 2} more</div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* legend */}
            <div className="flex items-center gap-5 mt-3">
              {URGENCY.map((u) => (
                <div key={u} className="flex items-center gap-2">
                  <UrgencyDot level={u} size={8} />
                  <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", color: MUTE }}>
                    {u === "med" ? "medium" : u}
                  </span>
                </div>
              ))}
            </div>

            {/* day editor */}
            <DayEditor
              dateKey={selected}
              events={selEvents}
              onAdd={addEvent}
              onUpdate={updateEvent}
              onDelete={deleteEvent}
            />
          </section>

          {/* ---------- RIGHT RAIL (2/5) ---------- */}
          <aside className="lg:col-span-2 flex flex-col gap-10">

            {/* needs an answer */}
            <Panel title="Needs an answer" count={state.decisions.filter((d) => inView(d.who) && d.answer === null).length}>
              {state.decisions.filter((d) => inView(d.who)).map((d) => {
                const settled = d.answer !== null;
                return (
                  <div key={d.id} className="py-3 flex items-start justify-between gap-3"
                    style={{ borderBottom: `1px solid ${LINE}` }}>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Label style={{ fontSize: 9 }}>{d.category} · for {whoLong[d.who]}</Label>
                        <WhoTag who={d.who} />
                      </div>
                      <div
                        className="mt-1 transition-all"
                        style={{
                          fontSize: 14,
                          lineHeight: 1.45,
                          textDecoration: settled ? "line-through" : "none",
                          textDecorationColor: MUTE,
                          opacity: settled ? 0.38 : 1,
                        }}
                      >
                        {d.text}
                        {d.link && (
                          <a href={d.link} target="_blank" rel="noreferrer"
                            className="inline-flex items-center gap-1 ml-2 align-middle"
                            style={{ color: SLATE }}>
                            <ExternalLink size={12} />
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0 pt-1">
                      {["yes", "no"].map((a) => {
                        const active = d.answer === a;
                        return (
                          <button key={a} onClick={() => answerDecision(d.id, a)}
                            style={{
                              fontFamily: MONO, fontSize: 9, letterSpacing: "0.14em",
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
              })}
              <QuickAdd
                placeholder="New question…"
                onAdd={(text, who) =>
                  addTo("decisions", { id: nid(), category: "Scheduling", who, text, answer: null })
                }
              />
            </Panel>

            {/* checklist */}
            <Panel title="Checklist" count={state.checklist.filter((c) => inView(c.who) && !c.done).length}>
              {state.checklist.filter((c) => inView(c.who)).map((c) => (
                <CheckRow key={c.id} item={c}
                  onToggle={() => toggleItem("checklist", c.id)}
                  onDelete={() => removeFrom("checklist", c.id)} />
              ))}
              <QuickAdd
                placeholder="New checklist item…"
                onAdd={(text, who) => addTo("checklist", { id: nid(), text, who, done: false })}
              />
            </Panel>

            {/* reminders */}
            <Panel title="Reminders" count={state.reminders.filter((r) => inView(r.who) && !r.done).length}>
              {state.reminders.filter((r) => inView(r.who)).map((r) => (
                <CheckRow key={r.id} item={r}
                  onToggle={() => toggleItem("reminders", r.id)}
                  onDelete={() => removeFrom("reminders", r.id)} />
              ))}
              <QuickAdd
                placeholder="New reminder…"
                onAdd={(text, who) => addTo("reminders", { id: nid(), text, who, done: false })}
              />
            </Panel>
          </aside>
        </div>

        {/* ============ FOOTER ============ */}
        <footer className="mt-16 pt-5 flex items-center justify-between flex-wrap gap-3"
          style={{ borderTop: `1px solid ${LINE}` }}>
          <div className="flex items-center gap-5">
            <Label style={{ letterSpacing: "0.18em" }}>Synced live</Label>
            <button onClick={() => supabase.auth.signOut()}
              style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.14em", color: MUTE, background: "none", border: "none", cursor: "pointer" }}>
              SIGN OUT
            </button>
          </div>
          {confirmReset ? (
            <div className="flex items-center gap-3">
              <span style={{ fontFamily: MONO, fontSize: 10, color: SLATE }}>Restore original data?</span>
              <button onClick={resetAll}
                style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.1em", color: "#fff", background: INK, border: "none", padding: "5px 12px", borderRadius: 2, cursor: "pointer" }}>
                CONFIRM
              </button>
              <button onClick={() => setConfirmReset(false)}
                style={{ fontFamily: MONO, fontSize: 10, color: MUTE, background: "none", border: "none", cursor: "pointer" }}>
                CANCEL
              </button>
            </div>
          ) : (
            <button onClick={() => setConfirmReset(true)}
              className="flex items-center gap-2"
              style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.14em", color: MUTE, background: "none", border: "none", cursor: "pointer" }}>
              <RotateCcw size={11} /> RESET
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}

/* ======================================================================= */
/* app root — everything behind the sign-in gate                           */

export default function App() {
  return (
    <AuthGate>
      <HouseholdLedger />
    </AuthGate>
  );
}

/* ======================================================================= */
/* sub-components                                                          */

function Panel({ title, count, children }) {
  return (
    <section>
      <div className="flex items-baseline justify-between pb-2"
        style={{ borderBottom: `1px solid #111418` }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, letterSpacing: "0.01em" }}>{title}</h2>
        <span style={{ fontFamily: MONO, fontSize: 10, color: MUTE }}>
          {count} open
        </span>
      </div>
      <div>{children}</div>
    </section>
  );
}

function CheckRow({ item, onToggle, onDelete }) {
  return (
    <div className="py-3 flex items-start gap-3 group"
      style={{ borderBottom: `1px solid ${LINE}` }}>
      <button
        onClick={onToggle}
        aria-label={item.done ? "Mark incomplete" : "Mark complete"}
        className="flex-shrink-0 flex items-center justify-center transition-colors"
        style={{
          width: 16, height: 16, marginTop: 2, borderRadius: 2,
          border: `1.5px solid ${item.done ? INK : "#B6BDC6"}`,
          background: item.done ? INK : "transparent",
          cursor: "pointer", padding: 0,
        }}
      >
        {item.done && <Check size={11} color="#fff" strokeWidth={3} />}
      </button>
      <div className="flex-1 min-w-0 transition-all"
        style={{
          fontSize: 14, lineHeight: 1.45,
          textDecoration: item.done ? "line-through" : "none",
          textDecorationColor: MUTE,
          opacity: item.done ? 0.38 : 1,
        }}>
        {item.text}
        {item.link && (
          <a href={item.link} target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-1 ml-2 align-middle" style={{ color: SLATE }}>
            <ExternalLink size={12} />
          </a>
        )}
      </div>
      <WhoTag who={item.who} />
      <button onClick={onDelete} aria-label="Delete item"
        className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
        style={{ color: MUTE, background: "none", border: "none", cursor: "pointer", padding: 2 }}>
        <X size={13} />
      </button>
    </div>
  );
}

function QuickAdd({ placeholder, onAdd }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [who, setWho] = useState("both");

  const submit = () => {
    if (!text.trim()) return;
    onAdd(text.trim(), who);
    setText("");
    setOpen(false);
  };

  if (!open)
    return (
      <button onClick={() => setOpen(true)}
        className="flex items-center gap-2 pt-3"
        style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.16em", color: "#98A1AC", background: "none", border: "none", cursor: "pointer" }}>
        <Plus size={12} /> ADD
      </button>
    );

  return (
    <div className="pt-3 flex items-center gap-2 flex-wrap">
      <input
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") submit(); if (e.key === "Escape") setOpen(false); }}
        placeholder={placeholder}
        className="flex-1"
        style={{
          fontFamily: SANS, fontSize: 13, padding: "7px 10px",
          border: `1px solid ${LINE}`, borderRadius: 2, background: FIELD,
          minWidth: 160, color: INK,
        }}
      />
      <WhoPicker value={who} onChange={setWho} />
      <button onClick={submit}
        style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.1em", padding: "7px 12px", background: INK, color: "#fff", border: "none", borderRadius: 2, cursor: "pointer" }}>
        SAVE
      </button>
      <button onClick={() => setOpen(false)} aria-label="Cancel"
        style={{ color: MUTE, background: "none", border: "none", cursor: "pointer" }}>
        <X size={14} />
      </button>
    </div>
  );
}

function DayEditor({ dateKey, events, onAdd, onUpdate, onDelete }) {
  const [text, setText] = useState("");
  const [who, setWho] = useState("both");
  const [urgency, setUrgency] = useState("low");

  const [y, m, d] = dateKey.split("-").map(Number);
  const nice = new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });

  const cycle = (u) => URGENCY[(URGENCY.indexOf(u) + 1) % URGENCY.length];

  const submit = () => {
    if (!text.trim()) return;
    onAdd(dateKey, text.trim(), who, urgency);
    setText("");
  };

  return (
    <div className="mt-6 p-4 sm:p-5" style={{ background: "#F7F8F9", borderRadius: 2 }}>
      <Label>Planning · {nice}</Label>

      <div className="mt-3 flex flex-col gap-2">
        {events.length === 0 && (
          <div style={{ fontSize: 13, color: "#98A1AC" }}>
            Nothing planned yet — add the first thing below.
          </div>
        )}
        {events.map((e) => (
          <div key={e.id} className="flex items-center gap-3 group py-1">
            <UrgencyDot level={e.urgency} onClick={() => onUpdate(dateKey, e.id, { urgency: cycle(e.urgency) })} />
            <input
              value={e.text}
              onChange={(ev) => onUpdate(dateKey, e.id, { text: ev.target.value })}
              className="flex-1 min-w-0"
              style={{
                fontFamily: SANS, fontSize: 13, background: "transparent",
                border: "none", borderBottom: `1px solid transparent`, color: "#111418", padding: "2px 0",
              }}
              onFocus={(ev) => (ev.target.style.borderBottom = "1px solid #E6E8EB")}
              onBlur={(ev) => (ev.target.style.borderBottom = "1px solid transparent")}
            />
            <WhoTag who={e.who} />
            <button onClick={() => onDelete(dateKey, e.id)} aria-label="Delete event"
              className="opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ color: "#98A1AC", background: "none", border: "none", cursor: "pointer", padding: 2 }}>
              <X size={13} />
            </button>
          </div>
        ))}
      </div>

      {/* add row */}
      <div className="mt-4 flex items-center gap-2 flex-wrap">
        <UrgencyDot level={urgency} onClick={() => setUrgency(cycle(urgency))} size={11} />
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Add to this day… (Enter to save)"
          className="flex-1"
          style={{
            fontFamily: SANS, fontSize: 13, padding: "7px 10px",
            border: `1px solid #E6E8EB`, borderRadius: 2, background: "#fff",
            minWidth: 170, color: "#111418",
          }}
        />
        <WhoPicker value={who} onChange={setWho} />
        <button onClick={submit}
          style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.1em", padding: "7px 12px", background: "#111418", color: "#fff", border: "none", borderRadius: 2, cursor: "pointer" }}>
          ADD
        </button>
      </div>
    </div>
  );
}
