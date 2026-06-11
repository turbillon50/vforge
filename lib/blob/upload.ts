/**
 * Subida de archivos a Vercel Blob (store "vforge-evidence").
 *
 * Lo usa el portal del cliente para guardar fotos y evidencias que el cliente
 * sube desde su celular. Requiere BLOB_READ_WRITE_TOKEN (inyectado en el
 * proyecto de Vercel). El acceso es público (URLs directas a la imagen).
 */
import { put } from "@vercel/blob";

export function blobConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

const SAFE = /[^a-zA-Z0-9._-]/g;

export interface UploadResult {
  url: string;
  pathname: string;
  contentType: string;
  size: number;
}

/**
 * Sube un archivo del cliente. La ruta queda namespaced por proyecto:
 *   evidence/<projectId>/<timestamp>-<nombre-seguro>
 */
export async function uploadEvidence(
  projectId: string,
  file: File,
  stamp: number,
): Promise<UploadResult> {
  if (!blobConfigured()) {
    throw new Error("Almacenamiento no configurado (BLOB_READ_WRITE_TOKEN)");
  }
  const cleanName = (file.name || "archivo").replace(SAFE, "_").slice(-80);
  const pathname = `evidence/${projectId}/${stamp}-${cleanName}`;
  const blob = await put(pathname, file, {
    access: "public",
    contentType: file.type || "application/octet-stream",
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });
  return {
    url: blob.url,
    pathname: blob.pathname,
    contentType: file.type || "application/octet-stream",
    size: file.size,
  };
}
