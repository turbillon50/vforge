import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

interface RunRequest {
  messages: ChatTurn[];
  sessionId: string;
  projectId?: string | null;
}

export async function POST(req: Request) {
  // Auth
  const { userId } = await auth();
  if (!userId) {
    return new NextResponse(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: RunRequest;
  try {
    body = await req.json();
  } catch {
    return new NextResponse(JSON.stringify({ error: "bad request" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { messages } = body;
  if (!messages || messages.length === 0) {
    return new NextResponse(JSON.stringify({ error: "no messages" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new NextResponse(JSON.stringify({ error: "no model configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const systemPrompt = `Eres V — la IA de VForge, plataforma para desarrolladores. 
Responde en español mexicano, directo y sin rodeos. 
Ayudas con código, infraestructura, APIs, deployments y todo lo del stack: Next.js, Neon, Clerk, Vercel, GitHub, Stripe.
Nunca finjas herramientas que no tienes. Sé honesta sobre tus límites.`;

  // Llamada directa a Anthropic — streaming
  const upstream = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-beta": "claude-sonnet-4-6",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      stream: true,
      system: systemPrompt,
      messages: messages.slice(-20), // últimas 20 vueltas
    }),
  });

  if (!upstream.ok) {
    const err = await upstream.text();
    return new NextResponse(
      JSON.stringify({ error: `upstream error: ${upstream.status}`, detail: err }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }

  // Pasar stream directamente al cliente
  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
