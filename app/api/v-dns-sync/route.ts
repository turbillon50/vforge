import { upsertRecord } from "@/lib/namecom/client";

export async function POST(request: Request) {
  try {
    const domain = "vforge.site";

    // Update A record (apex)
    const aRecord = await upsertRecord(domain, {
      host: "",
      type: "A",
      answer: "216.15.0.11",
      ttl: 300,
    });

    // Update CNAME record (www)
    const cnameRecord = await upsertRecord(domain, {
      host: "www",
      type: "CNAME",
      answer: "89e6b7f3b6091a8d.vercel-dns-016.com",
      ttl: 300,
    });

    return Response.json({
      ok: true,
      aRecord,
      cnameRecord,
      message: "DNS records updated. Waiting for propagation...",
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return Response.json(
      { ok: false, error: msg },
      { status: 500 }
    );
  }
}
