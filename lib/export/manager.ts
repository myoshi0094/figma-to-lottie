/**
 * Export Manager
 * S3 / SharePoint へのサーバーサイドエクスポートを管理する。
 * ローカルダウンロードはクライアントサイドで処理するため含まない。
 */

import { createS3Client, uploadToS3 } from "@/lib/storage/s3";
import type { StorageConfig } from "@/types";

export interface ExportResult {
  success: boolean;
  location?: string;
  error?: string;
}

/** S3 への dotLottie アップロード */
export async function exportToS3(
  bytes: Uint8Array,
  fileName: string,
  config: NonNullable<StorageConfig["s3"]>
): Promise<ExportResult> {
  try {
    const client = createS3Client(config);
    const key = `lottie/${fileName}`;
    await uploadToS3(client, config.bucket, key, bytes, "application/zip");
    return { success: true, location: `s3://${config.bucket}/${key}` };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

/** SharePoint Drive へ PUT アップロード（Bearer トークン使用） */
export async function exportToSharePoint(
  bytes: Uint8Array,
  _fileName: string,
  endpointUrl: string,
  bearerToken: string
): Promise<ExportResult> {
  try {
    const res = await fetch(endpointUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${bearerToken}`,
        "Content-Type": "application/octet-stream",
        "Content-Length": String(bytes.byteLength),
      },
      // slice(0) で独立した ArrayBuffer を生成し BodyInit 型を満たす
      body: bytes.slice(0).buffer as ArrayBuffer,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { success: false, error: `HTTP ${res.status}: ${text}` };
    }

    const json = (await res.json().catch(() => ({}))) as {
      webUrl?: string;
      id?: string;
    };
    return {
      success: true,
      location: json.webUrl ?? json.id ?? endpointUrl,
    };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

/** StorageConfig をもとに自動ルーティング */
export async function exportDotLottie(
  bytes: Uint8Array,
  fileName: string,
  config: StorageConfig & { spEndpointUrl?: string; spBearerToken?: string }
): Promise<ExportResult> {
  switch (config.provider) {
    case "s3":
      if (!config.s3) return { success: false, error: "S3 config missing" };
      return exportToS3(bytes, fileName, config.s3);

    case "sharepoint":
      if (!config.spEndpointUrl || !config.spBearerToken)
        return { success: false, error: "SharePoint endpoint / token missing" };
      return exportToSharePoint(
        bytes,
        fileName,
        config.spEndpointUrl,
        config.spBearerToken
      );

    case "local":
    default:
      return { success: true, location: "local" };
  }
}
