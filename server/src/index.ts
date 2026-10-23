import "dotenv/config";
import express, {
  type NextFunction,
  type Request,
  type RequestHandler,
  type Response
} from "express";
import cors from "cors";
import pool, { initDb } from "./db";
import { confirmationMessage } from "./ai";

type Row = {
  id: number;
  date: string;
  start_time: string;
  duration: number;
  subject: string;
  booked_name: string | null;
};

const toSlot = (r: Row) => ({
    id: r.id,
    date: r.date,
    startTime: r.start_time,
    duration: r.duration,
    subject: r.subject,
    booked: r.booked_name !== null
});

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const h =
    (fn: (req: Request, res: Response) => Promise<unknown>): RequestHandler =>
        (req, res, next) => {
          fn(req, res).catch(next);
        };

const app = express();
app.use(cors());
app.use(express.json());

const ready = initDb();
app.use(async (_req, _res, next) => {
  try {
    await ready;
    next();
  } catch (e) {
    next(e);
  }
});

app.get(
    "/api/slots",
    h(async (_req, res) => {
        const { rows } = await pool.query<Row>(
            "SELECT * FROM slots ORDER BY date, start_time"
        );
        res.json(rows.map(toSlot));
    })
);

app.post(
    "/api/slots",
    h(async (req, res) => {
      const { date, startTime, duration } = req.body ?? {};
      const subject = String(req.body?.subject ?? "").trim();
      const minutes = Number(duration);

      if (!subject || subject.length > 100) {
        return res.status(400).json({ error: "Subject is required (max 100 characters)" });
      }
      if (!DATE_RE.test(date) || !TIME_RE.test(startTime)) {
        return res.status(400).json({ error: "Enter a valid date and start time" });
      }
      if (!Number.isInteger(minutes) || minutes < 5 || minutes > 480) {
        return res.status(400).json({ error: "Duration must be between 5 and 480 minutes" });
      }

      try {
        const { rows } = await pool.query<Row>(
            "INSERT INTO slots (date, start_time, duration, subject) VALUES ($1, $2, $3, $4) RETURNING *",
            [date, startTime, minutes, subject]
        );
        res.status(201).json(toSlot(rows[0]));
      } catch (e) {
        if ((e as { code?: string }).code === "23505") {
          return res.status(409).json({ error: "A slot already exists at that date and time" });
        }
        throw e;
      }
    })
);

app.post(
    "/api/book",
    h(async (req, res) => {
        const id = Number(req.body?.id);
      const name = String(req.body?.name ?? "").trim();
      const email = String(req.body?.email ?? "").trim();
      const description = String(req.body?.description ?? "").trim().slice(0, 500);

      if (!Number.isInteger(id)) return res.status(404).json({ error: "Slot not found" });
      if (!name) return res.status(400).json({ error: "Name is required" });
      if (!EMAIL_RE.test(email)) return res.status(400).json({ error: "Enter a valid email" });

      const result = await pool.query<Row>(
          "UPDATE slots SET booked_name = $1, booked_email = $2, description = $3, booked_at = NOW() WHERE id = $4 AND booked_name IS NULL RETURNING *",
          [name, email, description || null, id]
      );

      if (result.rowCount === 0) {
        const exists = await pool.query("SELECT id FROM slots WHERE id = $1", [id]);
        return exists.rowCount
            ? res.status(409).json({ error: "Sorry, this slot was just booked by someone else" })
            : res.status(404).json({ error: "Slot not found" });
      }

      const row = result.rows[0];
      const message = await confirmationMessage(name, row.date, row.start_time, row.duration);
      await pool.query("UPDATE slots SET confirmation = $1 WHERE id = $2", [message, id]);

      res.json({ slot: toSlot(row), confirmation: message });
    })
);

app.delete(
    "/api/slots",
    h(async (req, res) => {
        const id = Number(req.query.id);
      if (!Number.isInteger(id)) return res.status(404).json({ error: "Slot not found" });
      const result = await pool.query("DELETE FROM slots WHERE id = $1", [id]);
      if (result.rowCount === 0) return res.status(404).json({ error: "Slot not found" });
      res.json({ deleted: true });
    })
);

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Server error" });
});

if (!process.env.VERCEL) {
  const port = Number(process.env.PORT) || 3001;
  app.listen(port, () => console.log(`API running on http://localhost:${port}`));
}

export default app;