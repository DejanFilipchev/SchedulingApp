export type Slot = {
  id: number;
  date: string;
  startTime: string;
  duration: number;
  subject: string;
  booked: boolean;
};

export type BookingResult = { slot: Slot; confirmation: string };

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Something went wrong");
  return data as T;
}

export const getSlots = () => request<Slot[]>("/api/slots");

export const createSlot = (input: {
  subject: string;
  date: string;
  startTime: string;
  duration: number;
}) => request<Slot>("/api/slots", { method: "POST", body: JSON.stringify(input) });

export const bookSlot = (id: number, input: { name: string; email: string; description: string }) =>
    request<BookingResult>("/api/book", {
      method: "POST",
      body: JSON.stringify({ id, ...input })
    });