import { useEffect, useRef, useState } from "react";

export type AutosaveStatus = "idle" | "pending" | "saving" | "saved" | "error";

/**
 * Debounces `value` and calls `onSave` after `delayMs` of no changes.
 * Returns a status string for a small "Saving… / Saved" indicator, so
 * autosaving forms don't leave the person guessing whether it worked.
 */
export function useAutosave<T>(value: T, onSave: (value: T) => Promise<void>, delayMs = 900) {
  const [status, setStatus] = useState<AutosaveStatus>("idle");
  const isFirstRun = useRef(true);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    setStatus("pending");
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(async () => {
      setStatus("saving");
      try {
        await onSave(value);
        setStatus("saved");
      } catch (err) {
        console.error(err);
        setStatus("error");
      }
    }, delayMs);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return status;
}

export function AutosaveIndicator({ status }: { status: AutosaveStatus }) {
  const text = { idle: "", pending: "Unsaved changes", saving: "Saving…", saved: "Saved", error: "Couldn't save" }[status];
  const color = status === "error" ? "var(--status-danger)" : status === "saved" ? "var(--status-success)" : "var(--text-tertiary)";
  if (!text) return null;
  return <span style={{ fontSize: 11, color }}>{text}</span>;
}
