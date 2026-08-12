import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma, getCurrentUser } from "@/lib/db";
import { parseDocument, ParseError } from "@/lib/parser";
import { putObject } from "@/lib/storage";

const schema = z.object({
  kind: z.enum(["lab_pdf", "inbody_img"]),
  fileName: z.string().min(1),
  size: z.number().int().nonnegative().default(0),
  mime: z.string().default("application/octet-stream"),
  data: z.string().optional(), // base64 file bytes — used only by the real Claude parser
});

// OCR + AI-vision parse. Delegates to the mock or real Claude provider (PARSE_PROVIDER).
export async function POST(req: Request) {
  const user = await getCurrentUser();
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz dosya bilgisi." }, { status: 400 });
  }
  const { kind, fileName, size, mime, data } = parsed.data;

  // Persist the original bytes when provided (S3/R2 in prod, local disk in dev).
  // Falls back to a synthetic key when no bytes were uploaded (mock flow).
  let storageKey = `poc/${Date.now()}-${fileName}`;
  if (data) {
    try {
      const bytes = Buffer.from(data, "base64");
      ({ storageKey } = await putObject({ userId: user.id, fileName, mime, bytes }));
    } catch (err) {
      console.error("[ingest] storage put failed, using synthetic key:", err);
    }
  }

  const file = await prisma.fileAsset.create({
    data: {
      userId: user.id,
      kind,
      fileName,
      mime,
      size,
      storageKey,
      parseStatus: "processing",
    },
  });

  let result, provider;
  try {
    ({ parsed: result, provider } = await parseDocument(kind, { data, mime }));
  } catch (err) {
    await prisma.fileAsset.update({
      where: { id: file.id },
      data: { parseStatus: "failed" },
    });
    const message = err instanceof ParseError ? err.message : "Belge okunamadı. Lütfen tekrar deneyin.";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const confidence = "confidence" in result ? result.confidence : 0.95;

  await prisma.fileAsset.update({
    where: { id: file.id },
    data: { parseStatus: "done", parseConfidence: confidence },
  });

  return NextResponse.json({ fileId: file.id, kind, parsed: result, provider });
}
