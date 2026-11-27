import { createFileRoute } from "@tanstack/react-router";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// Public read-only API: GET /api/public/stickers?q=title&offset=0
export const Route = createFileRoute("/api/public/stickers")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const q = (url.searchParams.get("q") ?? "").slice(0, 100);
        const offset = Math.max(0, Math.min(10000, Number(url.searchParams.get("offset")) || 0));
        const { listPublic } = await import("@/lib/public-stickers.server");
        try {
          return Response.json(await listPublic(q, offset), { headers: CORS });
        } catch {
          return Response.json({ error: "Unavailable" }, { status: 500, headers: CORS });
        }
      },
    },
  },
});
