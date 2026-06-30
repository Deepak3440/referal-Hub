import { Router, type IRouter } from "express";
import { z } from "zod";
import { searchCompanies, searchRoles, searchLocations, searchColleges } from "../services/career-search";

const router: IRouter = Router();

const SearchQuery = z.object({
  q: z.string().optional().default(""),
  limit: z.coerce.number().int().min(1).max(20).optional().default(12),
});

router.get("/career/companies", (req, res): void => {
  const parsed = SearchQuery.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid search query" });
    return;
  }

  const items = searchCompanies(parsed.data.q, parsed.data.limit);
  res.json({ items, query: parsed.data.q.trim() });
});

router.get("/career/roles", (req, res): void => {
  const parsed = SearchQuery.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid search query" });
    return;
  }

  const items = searchRoles(parsed.data.q, parsed.data.limit);
  res.json({ items, query: parsed.data.q.trim() });
});

router.get("/career/locations", (req, res): void => {
  const parsed = SearchQuery.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid search query" });
    return;
  }

  const items = searchLocations(parsed.data.q, parsed.data.limit);
  res.json({ items, query: parsed.data.q.trim() });
});

router.get("/career/colleges", (req, res): void => {
  const parsed = SearchQuery.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid search query" });
    return;
  }

  const items = searchColleges(parsed.data.q, parsed.data.limit);
  res.json({ items, query: parsed.data.q.trim() });
});

export default router;
