import React, { useState, useEffect } from "react";
import { supabase } from "./lib/supabase";

/*
 * AuthGate — magic-link sign-in, no passwords to remember.
 * Enter your email → Supabase emails you a link → tap it → you're in.
 * Sessions persist on the device, so after the first sign-in each of
 * you stays logged in on your own phone/laptop.
 */

const INK = "#111418";
const SLATE = "#5B6470";
const MUTE = "#98A1AC";
const LINE = "#E6E8EB";
const MONO = "'IBM Plex Mono', ui-monospace, monospace";
const SANS = "'Schibsted Grotesk', -apple-system, 'Helvetica Neue', sans-serif";
const SERIF = "'Instrument Serif', Georgia, serif";

export default function AuthGate({ children }) {
  const [session, setSession] = useState(undefined); // undefined = still checking
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const sendLink = async () => {
    if (!email.trim()) return;
    setBusy(true);
    setErr(null);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    });
    setBusy(false);
    if (error) setErr(error.message);
    else setSent(true);
  };

  /* checking session */
  if (session === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#fff" }}>
        <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.2em", color: MUTE }}>
          OPENING LEDGER…
        </div>
      </div>
    );
  }

  /* signed in → show the app */
  if (session) return children;

  /* sign-in screen */
  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: "#fff", fontFamily: SANS }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&family=IBM+Plex+Mono:wght@400;500&display=swap');
        input:focus-visible, button:focus-visible { outline: 2px solid ${INK}; outline-offset: 2px; }
        input::placeholder { color: ${MUTE}; }
      `}</style>

      <div className="w-full" style={{ maxWidth: 380 }}>
        <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.22em", color: MUTE, textTransform: "uppercase" }}>
          Household ledger
        </div>
        <h1 className="mt-2" style={{ fontSize: 34, fontWeight: 600, letterSpacing: "-0.02em", color: INK, lineHeight: 1 }}>
          AJ <span style={{ fontFamily: SERIF, fontStyle: "italic", fontWeight: 400 }}>&</span> Melissa
        </h1>

        <div className="mt-8 pt-6" style={{ borderTop: `1px solid ${INK}` }}>
          {sent ? (
            <div>
              <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.18em", color: INK }}>
                CHECK YOUR EMAIL
              </div>
              <p className="mt-2" style={{ fontSize: 14, color: SLATE, lineHeight: 1.6 }}>
                A sign-in link is on its way to <strong style={{ color: INK }}>{email}</strong>.
                Tap it on this device and the ledger will open.
              </p>
              <button
                onClick={() => setSent(false)}
                className="mt-4"
                style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.14em", color: MUTE, background: "none", border: "none", cursor: "pointer", padding: 0 }}
              >
                USE A DIFFERENT EMAIL
              </button>
            </div>
          ) : (
            <div>
              <label htmlFor="email" style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.18em", color: SLATE, textTransform: "uppercase" }}>
                Sign in with your email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendLink()}
                placeholder="you@example.com"
                className="w-full mt-3"
                style={{
                  fontFamily: SANS, fontSize: 15, padding: "11px 13px",
                  border: `1px solid ${LINE}`, borderRadius: 2, background: "#F7F8F9", color: INK,
                }}
              />
              <button
                onClick={sendLink}
                disabled={busy}
                className="w-full mt-3"
                style={{
                  fontFamily: MONO, fontSize: 11, letterSpacing: "0.18em",
                  padding: "12px 0", background: INK, color: "#fff",
                  border: "none", borderRadius: 2, cursor: "pointer",
                  opacity: busy ? 0.5 : 1,
                }}
              >
                {busy ? "SENDING…" : "EMAIL ME A SIGN-IN LINK"}
              </button>
              {err && (
                <p className="mt-3" style={{ fontFamily: MONO, fontSize: 11, color: INK }}>
                  {err}
                </p>
              )}
              <p className="mt-4" style={{ fontSize: 12, color: MUTE, lineHeight: 1.6 }}>
                No password needed — you'll get a one-tap link. Only the two
                emails added to the household can see anything.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
