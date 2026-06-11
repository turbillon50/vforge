/**
 * API Marketplace — producto individual.
 *
 * PATCH  — (solo owner) edita SOLO los campos enviados. updated_at=now().
 * DELETE — (solo owner) borra el producto.
 */
import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { queryOne } from "@/lib/db/client";
import { isOwnerEmail } from "@/lib/auth/owner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type MarketplaceProduct = {
  id: string;
  slug: string;
  title: string;
  tagline: string | null;
  description: string | null;
  category: string | null;
  price_label: string | null;
  cover_image: string | null;
  gallery: unknown;
  video_url: string | null;
  features: unknown;
  cta_label: string | null;
  cta_url: string | null;
  status: string;
  featured: boolean;
  position: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

async function isOwner(): Promise<boolean> {
  const user = await currentUser();
  const email = user?.emailAddresses?.[0]?.emailAddress ?? null;
  return isOwnerEmail(email);
}

// Campos editables. Los jsonb se serializan con ::jsonb en el SQL.
const TEXT_FIELDS = [
  "slug",
  "title",
  "tagline",
  "description",
  "category",
  "price_label",
  "cover_image",
  "video_url",
  "cta_label",
  "cta_url",
  "status",
] as const;
const JSON_FIELDS = ["gallery", "features"] as const;
const BOOL_FIELDS = ["featured"] as const;
const INT_FIELDS = ["position"] as const;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    if (!(await isOwner())) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Body inválido" }, { status: 400 });
    }
    const data = body as Record<string, unknown>;

    const sets: string[] = [];
    const values: unknown[] = [];
    let i = 1;

    for (const field of TEXT_FIELDS) {
      if (field in data) {
        sets.push(`${field} = $${i++}`);
        values.push(data[field] ?? null);
      }
    }
    for (const field of JSON_FIELDS) {
      if (field in data) {
        sets.push(`${field} = $${i++}::jsonb`);
        values.push(JSON.stringify(data[field] ?? []));
      }
    }
    for (const field of BOOL_FIELDS) {
      if (field in data) {
        sets.push(`${field} = $${i++}`);
        values.push(Boolean(data[field]));
      }
    }
    for (const field of INT_FIELDS) {
      if (field in data) {
        sets.push(`${field} = $${i++}`);
        values.push(Number(data[field]) || 0);
      }
    }

    if (sets.length === 0) {
      return NextResponse.json(
        { error: "Sin campos para actualizar" },
        { status: 400 },
      );
    }

    // Si cambia el slug, validar unicidad contra otros productos.
    if ("slug" in data && typeof data.slug === "string") {
      const clash = await queryOne<{ id: string }>(
        `SELECT id FROM marketplace_products WHERE slug = $1 AND id <> $2`,
        [data.slug.trim(), id],
      );
      if (clash) {
        return NextResponse.json(
          { error: "Ya existe un producto con ese slug" },
          { status: 409 },
        );
      }
    }

    sets.push(`updated_at = now()`);
    values.push(id);

    const product = await queryOne<MarketplaceProduct>(
      `UPDATE marketplace_products
       SET ${sets.join(", ")}
       WHERE id = $${i}
       RETURNING *`,
      values,
    );

    if (!product) {
      return NextResponse.json(
        { error: "Producto no encontrado" },
        { status: 404 },
      );
    }

    return NextResponse.json({ product });
  } catch (err) {
    console.error("[marketplace] PATCH error:", err);
    return NextResponse.json(
      { error: "No se pudo actualizar el producto" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    if (!(await isOwner())) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { id } = await params;

    const deleted = await queryOne<{ id: string }>(
      `DELETE FROM marketplace_products WHERE id = $1 RETURNING id`,
      [id],
    );

    if (!deleted) {
      return NextResponse.json(
        { error: "Producto no encontrado" },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true, id: deleted.id });
  } catch (err) {
    console.error("[marketplace] DELETE error:", err);
    return NextResponse.json(
      { error: "No se pudo borrar el producto" },
      { status: 500 },
    );
  }
}
