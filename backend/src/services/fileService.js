'use strict';

const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

// ── Determine storage backend ─────────────────────────────────────────────────
// Priority: S3-compatible (AWS / Cloudflare R2 / Hostinger Object Storage / any
//           S3-compatible endpoint) → local disk fallback
//
// Set these env vars for cloud storage:
//   AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_S3_BUCKET
// Optional:
//   AWS_REGION          (default: auto)
//   S3_ENDPOINT_URL     (for Cloudflare R2, Hostinger, MinIO, etc.)
//   S3_PUBLIC_URL       (public base URL for the bucket, e.g. https://pub-xxx.r2.dev)
// ─────────────────────────────────────────────────────────────────────────────

const hasS3 = !!(
  process.env.AWS_ACCESS_KEY_ID &&
  process.env.AWS_SECRET_ACCESS_KEY &&
  process.env.AWS_S3_BUCKET
);

let s3Client = null;
let getSignedUrl = null;

if (hasS3) {
  try {
    const { S3Client } = require('@aws-sdk/client-s3');
    const presigner = require('@aws-sdk/s3-request-presigner');
    getSignedUrl = presigner.getSignedUrl;

    const s3Config = {
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    };

    // Custom endpoint for Cloudflare R2, Hostinger Object Storage, MinIO, etc.
    if (process.env.S3_ENDPOINT_URL) {
      s3Config.endpoint = process.env.S3_ENDPOINT_URL;
      s3Config.region = process.env.AWS_REGION || 'auto';
      s3Config.forcePathStyle = true; // required for R2 and most S3-compatible APIs
    } else {
      s3Config.region = process.env.AWS_REGION || 'ap-south-1';
    }

    s3Client = new S3Client(s3Config);
    logger.info('✅ S3-compatible storage initialised');
  } catch (err) {
    logger.warn('⚠️  S3 SDK load failed — falling back to local disk:', err.message);
  }
}

if (!s3Client) {
  logger.info('📁 File storage: local disk (uploads/ directory)');
}

// ── Local upload directory ────────────────────────────────────────────────────
const LOCAL_UPLOAD_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(LOCAL_UPLOAD_DIR)) {
  fs.mkdirSync(LOCAL_UPLOAD_DIR, { recursive: true });
}

const BUCKET = process.env.AWS_S3_BUCKET;
const S3_PUBLIC_BASE = process.env.S3_PUBLIC_URL ||
  (process.env.S3_ENDPOINT_URL
    ? `${process.env.S3_ENDPOINT_URL}/${BUCKET}`
    : `https://${BUCKET}.s3.${process.env.AWS_REGION || 'ap-south-1'}.amazonaws.com`);

// ── Upload ────────────────────────────────────────────────────────────────────
const uploadFile = async (buffer, key, mimeType) => {
  if (s3Client) {
    const { PutObjectCommand } = require('@aws-sdk/client-s3');
    const command = new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    });
    await s3Client.send(command);
    return `${S3_PUBLIC_BASE}/${key}`;
  }

  // Local disk fallback
  const localPath = path.join(LOCAL_UPLOAD_DIR, key.replace(/\//g, '_'));
  fs.mkdirSync(path.dirname(localPath), { recursive: true });
  fs.writeFileSync(localPath, buffer);
  // Return a local URL that the backend serves at /uploads/:filename
  return `/uploads/${path.basename(localPath)}`;
};

// Alias kept for backwards-compat with any existing code that imports uploadToS3
const uploadToS3 = uploadFile;

// ── Delete ────────────────────────────────────────────────────────────────────
const deleteFromS3 = async (key) => {
  if (s3Client) {
    try {
      const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
      await s3Client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
    } catch (err) {
      logger.error('S3 delete error:', err.message);
    }
    return;
  }
  // Local fallback
  try {
    const localPath = path.join(LOCAL_UPLOAD_DIR, key.replace(/\//g, '_'));
    if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
  } catch (err) {
    logger.error('Local file delete error:', err.message);
  }
};

// ── Presigned / temporary URL ─────────────────────────────────────────────────
const getPresignedUrl = async (key, expiresIn = 3600) => {
  if (s3Client && getSignedUrl) {
    const { GetObjectCommand } = require('@aws-sdk/client-s3');
    const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
    return getSignedUrl(s3Client, command, { expiresIn });
  }
  // Local fallback — just return the direct path (no real expiry)
  return `/uploads/${key.replace(/\//g, '_')}`;
};

// ── Upload presigned URL (for direct-browser upload) ─────────────────────────
const getUploadPresignedUrl = async (mimeType, folder = 'uploads') => {
  const extension = mimeType.split('/')[1] || 'bin';
  const key = `${folder}/${uuidv4()}.${extension}`;

  if (s3Client) {
    // Return a simple URL — clients can POST via the API route instead of direct upload
    return { key, uploadUrl: `${S3_PUBLIC_BASE}/${key}` };
  }
  // Local fallback
  return { key, uploadUrl: `/uploads/${key.replace(/\//g, '_')}` };
};

// ── Allowed MIME types ────────────────────────────────────────────────────────
const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip',
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'video/mp4', 'video/webm',
  'audio/mpeg', 'audio/wav', 'audio/ogg',
  'text/plain',
];

const isAllowedType = (mimeType) => ALLOWED_TYPES.includes(mimeType);

module.exports = {
  uploadFile,
  uploadToS3,      // backwards-compat alias
  deleteFromS3,
  getPresignedUrl,
  getUploadPresignedUrl,
  isAllowedType,
  hasS3,           // routes can check if cloud storage is available
};
