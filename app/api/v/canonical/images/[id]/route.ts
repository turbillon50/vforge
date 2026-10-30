import { requireVOwner } from "@/lib/v-chat/auth";
import { readPhoto } from "@/lib/v-canonical/images";
export const runtime = "nodejs";
export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const access = await requireVOwner(req);
  if (access instanceof Response) return access;
  const { id } = await ctx.params;
  if (!/^[a-f0-9]{64}$/.test(id)) return new Response(null, { status: 400 });
  try {
    const data = await readPhoto(id);
    if (!data) return new Response(null, { status: 404 });
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": "inline; filename=photo.jpg",
      },
    });
  } catch {
    return new Response(null, { status: 503 });
  }
}
