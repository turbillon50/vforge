import { NextRequest, NextResponse } from "next/server";

const HETZNER_V_URL = "http://178.105.135.26/v/chat";
const HETZNER_SECRET = process.env.HETZNER_SECRET || "";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, history, session_id } = body;

    if (!message) {
      return NextResponse.json({ error: "message required" }, { status: 400 });
    }

    const upstream = await fetch(HETZNER_V_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret: HETZNER_SECRET,
        message,
        history: history || [],
        session_id: session_id || "default",
      }),
      signal: AbortSignal.timeout(60000),
    });

    if (!upstream.ok) {
      const err = await upstream.text();
      return NextResponse.json({ error: err }, { status: upstream.status });
    }

    const data = await upstream.json();
    return NextResponse.json(data);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
