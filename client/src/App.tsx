import { useCallback, useEffect, useState } from "react";
import { getSlots, type Slot } from "./api";
import SlotForm from "./SlotForm";
import SlotList from "./SlotList";

export default function App() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setSlots(await getSlots());
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load slots");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <main>
      <h1>Book a time with me</h1>
      <p className="subtitle">Pick an open slot and leave your name and email.</p>
      {error && <p className="error">{error}</p>}
      <div className="layout">
        <section className="card">
          <h2>Publish a slot</h2>
          <SlotForm onCreated={load} />
        </section>
        <section className="card">
          <h2>Slots</h2>
          {loading ? <p>Loading...</p> : <SlotList slots={slots} onChange={load} />}
        </section>
      </div>
    </main>
  );
}
