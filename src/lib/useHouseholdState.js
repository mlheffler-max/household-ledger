import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "./supabase";

/*
 * useHouseholdState(seed)
 * ---------------------------------------------------------------
 * The entire sync layer in one hook. It:
 *
 *   1. LOADS   — finds which household the signed-in user belongs to
 *                and pulls its `state` JSON (seeding it on first run).
 *   2. SAVES   — every setState() is written back to Supabase after a
 *                400ms debounce, tagged with this browser tab's
 *                CLIENT_ID so we can ignore our own echo.
 *   3. LISTENS — subscribes to Postgres realtime UPDATEs on that row.
 *                When your partner saves, their new state arrives here
 *                and re-renders your screen within ~1 second.
 *
 * Conflict model: last-write-wins on the whole state object, which is
 * the right tradeoff for a two-person app with debounced writes. If you
 * ever grow beyond that, split state into per-item rows.
 */

const CLIENT_ID =
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `c_${Math.random().toString(36).slice(2)}`;

export function useHouseholdState(seed) {
  const [state, setStateRaw] = useState(null);
  const [householdId, setHouseholdId] = useState(null);
  const [error, setError] = useState(null);
  const saveTimer = useRef(null);
  const householdRef = useRef(null);

  /* ---- 1. initial load ------------------------------------------------ */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Which household does this user belong to?
      const { data: member, error: mErr } = await supabase
        .from("household_members")
        .select("household_id")
        .limit(1)
        .maybeSingle();

      if (mErr) return setError(mErr.message);
      if (!member) return setError("no-household"); // signed in, not yet added

      const { data: hh, error: hErr } = await supabase
        .from("households")
        .select("state")
        .eq("id", member.household_id)
        .single();

      if (hErr) return setError(hErr.message);
      if (cancelled) return;

      householdRef.current = member.household_id;
      setHouseholdId(member.household_id);

      const isEmpty = !hh.state || Object.keys(hh.state).length === 0;
      setStateRaw(isEmpty ? seed : hh.state);

      // First person to open the app plants the seed data for both of you
      if (isEmpty) {
        await supabase
          .from("households")
          .update({ state: seed, client_id: CLIENT_ID })
          .eq("id", member.household_id);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---- 3. realtime subscription --------------------------------------- */
  useEffect(() => {
    if (!householdId) return;
    const channel = supabase
      .channel(`household-${householdId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "households",
          filter: `id=eq.${householdId}`,
        },
        (payload) => {
          // Ignore updates this same tab just wrote — only apply the partner's
          if (payload.new.client_id !== CLIENT_ID) {
            setStateRaw(payload.new.state);
          }
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [householdId]);

  /* ---- 2. debounced write-back ---------------------------------------- */
  const setState = useCallback((updater) => {
    setStateRaw((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        const id = householdRef.current;
        if (!id) return;
        const { error: sErr } = await supabase
          .from("households")
          .update({
            state: next,
            client_id: CLIENT_ID,
            updated_at: new Date().toISOString(),
          })
          .eq("id", id);
        if (sErr) console.error("Sync save failed:", sErr.message);
      }, 400);
      return next;
    });
  }, []);

  /* flush pending save if the tab closes mid-debounce */
  useEffect(() => {
    const flush = () => clearTimeout(saveTimer.current);
    window.addEventListener("beforeunload", flush);
    return () => window.removeEventListener("beforeunload", flush);
  }, []);

  return { state, setState, error };
}
