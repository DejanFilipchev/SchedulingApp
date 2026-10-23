import { useState, type FormEvent } from "react";
import { createSlot } from "./api";

export default function SlotForm({ onCreated }: { onCreated: () => Promise<void> }) {
  const [subject, setSubject] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [duration, setDuration] = useState(30);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await createSlot({ subject, date, startTime, duration });
      setSubject("");
      setStartTime("");
      await onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create slot");
    } finally {
      setSaving(false);
    }
  }

  return (
      <form onSubmit={submit}>
        <label>
          Subject
          <input
              type="text"
              placeholder="e.g. Career advice"
              value={subject}
              maxLength={100}
              onChange={(e) => setSubject(e.target.value)}
              required
          />
        </label>
        <label>
          Date
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </label>
        <label>
          Start time
          <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
          />
        </label>
        <label>
          Duration
          <select value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
            <option value={15}>15 minutes</option>
            <option value={30}>30 minutes</option>
            <option value={45}>45 minutes</option>
            <option value={60}>60 minutes</option>
          </select>
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={saving}>
          {saving ? "Publishing..." : "Publish slot"}
        </button>
      </form>
  );
}