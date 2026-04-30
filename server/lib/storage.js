import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';

const region = process.env.S3_REGION || process.env.AWS_REGION || 'us-east-1';
const bucket = process.env.S3_BUCKET || process.env.AWS_S3_BUCKET || '';

const s3 = new S3Client({ region, credentials: process.env.AWS_ACCESS_KEY_ID ? {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
} : undefined });

export const createPresignUpload = async ({ fileName, contentType }) => {
  const key = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}-${fileName.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`;
  const command = new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType });
  const url = await getSignedUrl(s3, command, { expiresIn: 60 * 15 });
  // public URL (may need adjustment depending on bucket policy)
  const publicUrl = `https://${bucket}.s3.${region}.amazonaws.com/${encodeURIComponent(key)}`;
  return { url, key, publicUrl };
};
