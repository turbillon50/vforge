/**
 * API Marketplace — catálogo de productos.
 *
 * GET   — lista productos. Owners ven todos (incl. draft/archived);
 *         no-owners solo status=published. Orden: position ASC, featured DESC.
 * POST  — (solo owner) crea producto. Valida slug único.
 */
import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { queryAll, queryOne } from "@/lib/db/client";
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

async function getOwnerEmail(): Promise<string | null> {
  const user = await currentUser();
  const email = user?.emailAddresses?.[0]?.emailAddress ?? null;
  return isOwnerEmail(email) ? email : null;
}

export async function GET() {
  try {
    const owner = (await getOwnerEmail()) !== null;

    const products = owner
      ? await queryAll<MarketplaceProduct>(
          `SELECT * FROM marketplace_products
           ORDER BY position ASC, featured DESC`,
        )
      : await queryAll<MarketplaceProduct>(
          `SELECT * FROM marketplace_products
           WHERE status = 'published'
           ORDER BY position ASC, featured DESC`,
        );

    return NextResponse.json({ products });
  } catch (err) {
    console.error("[marketplace] GET error:", err);
    return NextResponse.json(
      { error: "No se pudieron cargar los productos" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const ownerEmail = await getOwnerEmail();
    if (!ownerEmail) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Body inválido" }, { status: 400 });
    }

    const {
      slug,
      title,
      tagline,
      description,
      category,
      price_label,
      cover_image,
      gallery,
      video_url,
      features,
      cta_label,
      cta_url,
      status,
      featured,
      position,
    } = body as Record<string, unknown>;

    if (typeof slug !== "string" || !slug.trim()) {
      return NextResponse.json({ error: "slug requerido" }, { status: 400 });
    }
    if (typeof title !== "string" || !title.trim()) {
      return NextResponse.json({ error: "title requerido" }, { status: 400 });
    }

    const existing = await queryOne<{ id: string }>(
      `SELECT id FROM marketplace_products WHERE slug = $1`,
      [slug.trim()],
    );
    if (existing) {
      return NextResponse.json(
        { error: "Ya existe un producto con ese slug" },
        { status: 409 },
      );
    }

    const product = await queryOne<MarketplaceProduct>(
      `INSERT INTO marketplace_products
        (slug, title, tagline, description, category, price_label,
         cover_image, gallery, video_url, features, cta_label, cta_url,
         status, featured, position, created_by)
       VALUES
        ($1, $2, $3, $4, $5, $6,
         $7, $8::jsonb, $9, $10::jsonb, $11, $12,
         $13, $14, $15, $16)
       RETURNING *`,
      [
        slug.trim(),
        title.trim(),
        tagline ?? null,
        description ?? null,
        category ?? null,
        price_label ?? null,
        cover_image ?? null,
        JSON.stringify(gallery ?? []),
        video_url ?? null,
        JSON.stringify(features ?? []),
        cta_label ?? "Ver mas",
        cta_url ?? null,
        typeof status === "string" ? status : "draft",
        typeof featured === "boolean" ? featured : false,
        typeof position === "number" ? position : 0,
        ownerEmail,
      ],
    );

    return NextResponse.json({ product }, { status: 201 });
  } catch (err) {
    console.error("[marketplace] POST error:", err);
    return NextResponse.json(
      { error: "No se pudo crear el producto" },
      { status: 500 },
    );
  }
}
