import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import type { S3Config } from "@/types";

export function createS3Client(config: S3Config): S3Client {
  return new S3Client({
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
}

export async function uploadToS3(
  client: S3Client,
  bucket: string,
  key: string,
  body: Uint8Array,
  contentType = "application/zip"
): Promise<string> {
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
  return key;
}

export async function downloadFromS3(
  client: S3Client,
  bucket: string,
  key: string
): Promise<Uint8Array> {
  const response = await client.send(
    new GetObjectCommand({ Bucket: bucket, Key: key })
  );

  const chunks: Uint8Array[] = [];
  for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
  }

  const total = chunks.reduce((acc, c) => acc + c.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

export async function listS3Objects(
  client: S3Client,
  bucket: string,
  prefix = ""
): Promise<string[]> {
  const response = await client.send(
    new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix })
  );
  return (response.Contents ?? []).map((obj) => obj.Key ?? "").filter(Boolean);
}
