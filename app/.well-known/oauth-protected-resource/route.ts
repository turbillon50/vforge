export const dynamic = "force-dynamic";
export async function GET() {
  return Response.redirect(
    "https://vforge.site/api/mcp/oauth/protected-resource-metadata",
    301
  );
}