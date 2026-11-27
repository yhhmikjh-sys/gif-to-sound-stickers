import { createFileRoute } from "@tanstack/react-router";

// Same-origin audio proxy for MyInstants sounds (their files have no CORS headers).
export const Route = createFileRoute("/api/sound")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const path = new URL(request.url).searchParams.get("path") ?? "";
        if (!/^\/media\/sounds\/[A-Za-z0-9._%-]+\.(mp3|wav|ogg|m4a)$/i.test(path)) {
          return new Response("Bad path", { status: 400 });
        }
        const res = await fetch(`https://www.myinstants.com${path}`, { headers: { "User-Agent": "Mozilla/5.0" } });
        if (!res.ok || !res.body) return new Response("Not found", { status: 404 });
        return new Response(res.body, {
          headers: {
            "Content-Type": res.headers.get("content-type") ?? "audio/mpeg",
            "Cache-Control": "public, max-age=86400",
          },
        });
      },
    },
  },
});
