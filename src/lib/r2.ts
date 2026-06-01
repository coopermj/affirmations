import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const REQUIRED_VARS = [
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET_NAME',
  'R2_PUBLIC_URL',
] as const

/** True when all R2 environment variables are present. */
export function isR2Configured(): boolean {
  return REQUIRED_VARS.every(v => !!process.env[v])
}

/** Throws a clear error if R2 is not configured. */
export function assertR2Configured(): void {
  const missing = REQUIRED_VARS.filter(v => !process.env[v])
  if (missing.length > 0) {
    throw new Error(`File storage is not configured (missing: ${missing.join(', ')})`)
  }
}

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID!}.r2.cloudflarestorage.com`,
  // Path-style keeps the bucket out of the hostname. R2's wildcard TLS cert
  // (*.r2.cloudflarestorage.com) only covers one subdomain level, so the
  // SDK's default virtual-hosted style (bucket.account.r2...) fails the TLS
  // handshake.
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

export async function getPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn = 300,
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
    ContentType: contentType,
  })
  return getSignedUrl(r2, command, { expiresIn })
}

export async function deleteR2Object(key: string): Promise<void> {
  await r2.send(
    new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET_NAME!, Key: key }),
  )
}

export function r2PublicUrl(key: string): string {
  return `${process.env.R2_PUBLIC_URL!}/${key}`
}
