import { useState, type FormEvent } from "react";
import { bookSlot, type Slot } from "./api";

const endTime = (start: string, duration: number) => {
  const [h, m] = start.split(":").map(Number);
  const total = h * 60 + m + duration;
  const hh = String(Math.floor(total / 60) % 24).padStart(2, "0");
  const mm = String(total % 60).padStart(2, "0");
  return `${hh}:${mm}`;
};

const formatDate = (date: string) =>
  new Date(`${date}T00:00`).toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric"
  });

type Props = { slots: Slot[]; onChange: () => Promise<void> };

export default function SlotList({ slots, onChange }: Props) {
  const [openId, setOpenId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmation, setConfirmation] = useState<{ id: number; text: string } | null>(null);
  
  const byDate = slots.reduce<Record<string, Slot[]>>((acc, slot) => {
    (acc[slot.date] ??= []).push(slot);
    return acc;
  }, {});

  function open(id: number) {
    setOpenId(id);
    setError("");
    setConfirmation(null);
  }

  async function submit(e: FormEvent, id: number) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const result = await bookSlot(id, { name, email, description });
      setConfirmation({ id, text: result.confirmation });
      getConfirmation(id)
          .then((r) =>
              setConfirmation((prev) => (prev && prev.id === id ? { id, text: r.confirmation } : prev))
          )
          .catch(() => {});
      setOpenId(null);
      setName("");
      setEmail("");
      setDescription("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Booking failed");
    } finally {
      setSaving(false);
      await onChange();
    }
  }

  if (slots.length === 0) return <p>No slots published yet.</p>;

  return (
    <div>
      {confirmation && (
          <div className="success">
            <p>{confirmation.text}</p>
            <button className="link" onClick={() => setConfirmation(null)}>
              Dismiss
            </button>
          </div>
      )}
      {Object.entries(byDate).map(([date, daySlots]) => (
        <div key={date} className="day">
          <h3>{formatDate(date)}</h3>
          {daySlots.map((slot) => (
            <div key={slot.id} className={`slot ${slot.booked ? "booked" : ""}`}>
              <div className="slot-row">
                <span>
                  <strong>{slot.subject || "Meeting"}</strong>{" "}
                  ({slot.startTime} - {endTime(slot.startTime, slot.duration)})
                </span>
                {slot.booked ? (
                  <span className="badge">Booked</span>
                ) : (
                  <button onClick={() => open(slot.id)}>Book</button>
                )}
              </div>
              {openId === slot.id && !slot.booked && (
                <form onSubmit={(e) => submit(e, slot.id)}>
                  <input
                    placeholder="Your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                  <input
                    type="email"
                    placeholder="Your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                  <textarea
                      placeholder="Description (optional)"
                      value={description}
                      rows={3}
                      maxLength={500}
                      onChange={(e) => setDescription(e.target.value)}
                  />
                  {error && <p className="error">{error}</p>}
                  <button type="submit" disabled={saving}>
                    {saving ? "Booking..." : "Confirm booking"}
                  </button>
                </form>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
