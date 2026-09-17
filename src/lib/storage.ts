// Object storage adapter. Env-gated backend:
//   - R2/S3 creds present  → uploads go to the S3-compatible bucket (Cloudflare R2, AWS S3, …)
//   - otherwise            → local ./storage dir (dev) — file bytes persisted on disk
// Returns a stable storageKey stored on FileAsset; the original bytes can later
// be re-fetched for re-parsing, export, or audit.
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const S3_ENDPOINT =
  process.env.S3_ENDPOINT ||
  (R2_ACCOUNT_ID ? `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : undefined);
const BUCKET = process.env.R2_BUCKET || process.env.S3_BUCKET;
const ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || process.env.S3_ACCESS_KEY_ID;
const SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || process.env.S3_SECRET_ACCESS_KEY;
const REGION = process.env.S3_REGION || "auto";

const LOCAL_DIR = resolve(process.cwd(), "storage");

export const storageBackend = (): "s3" | "local" =>
  BUCKET && ACCESS_KEY_ID && SECRET_ACCESS_KEY ? "s3" : "local";

let _client: S3Client | null = null;
function s3(): S3Client {
  if (!_client) {
    _client = new S3Client({
      region: REGION,
      endpoint: S3_ENDPOINT,
      forcePathStyle: Boolean(S3_ENDPOINT), // R2/MinIO need path-style
      credentials: { accessKeyId: ACCESS_KEY_ID!, secretAccessKey: SECRET_ACCESS_KEY! },
    });
  }
  return _client;
}

function buildKey(userId: string, fileName: string): string {
  const safe = fileName.replace(/[^\w.\-]+/g, "_").slice(-80);
  return `uploads/${userId}/${Date.now()}-${safe}`;
}

/** Persist raw bytes; returns the storageKey to save on the FileAsset. */
export async function putObject(opts: {
  userId: string;
  fileName: string;
  mime: string;
  bytes: Buffer;
}): Promise<{ storageKey: string; backend: "s3" | "local" }> {
  const key = buildKey(opts.userId, opts.fileName);
  if (storageBackend() === "s3") {
    await s3().send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: opts.bytes,
        ContentType: opts.mime,
      }),
    );
    return { storageKey: key, backend: "s3" };
  }
  const path = join(LOCAL_DIR, key);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, opts.bytes);
  return { storageKey: key, backend: "local" };
}

/** Fetch raw bytes back from whichever backend holds the key. */
export async function getObject(storageKey: string): Promise<Buffer> {
  if (storageBackend() === "s3") {
    const res = await s3().send(new GetObjectCommand({ Bucket: BUCKET, Key: storageKey }));
    const bytes = await res.Body!.transformToByteArray();
    return Buffer.from(bytes);
  }
  return readFile(join(LOCAL_DIR, storageKey));
}

/** Time-limited download URL (S3 only; local returns an app-relative path). */
export async function signedDownloadUrl(storageKey: string, expiresInSec = 900): Promise<string> {
  if (storageBackend() === "s3") {
    return getSignedUrl(s3(), new GetObjectCommand({ Bucket: BUCKET, Key: storageKey }), {
      expiresIn: expiresInSec,
    });
  }
  return `/storage/${storageKey}`;
}
