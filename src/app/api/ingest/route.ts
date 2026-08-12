import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma, getCurrentUser } from "@/lib/db";
import { parseDocument } from "@/lib/parser";

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

  const file = await prisma.fileAsset.create({
    data: {
      userId: user.id,
      kind,
      fileName,
      mime,
      size,
      storageKey: `poc/${Date.now()}-${fileName}`,
      parseStatus: "processing",
    },
  });

  const { parsed: result, provider } = await parseDocument(kind, { data, mime });
  const confidence = "confidence" in result ? result.confidence : 0.95;

  await prisma.fileAsset.update({
    where: { id: file.id },
    data: { parseStatus: "done", parseConfidence: confidence },
  });

  return NextResponse.json({ fileId: file.id, kind, parsed: result, provider });
}
