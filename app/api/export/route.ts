/**
 * POST /api/export
 *
 * Body (JSON):
 * {
 *   fileName: string
 *   data: number[]          // Uint8Array の Array 化
 *   storageConfig: StorageConfig & { spEndpointUrl?: string; spBearerToken?: string }
 * }
 *
 * Response: { location: string } | { error: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { exportDotLottie } from "@/lib/export/manager";
import type { StorageConfig } from "@/types";

interface RequestBody {
  fileName: string;
  data: number[];
  storageConfig: StorageConfig & {
    spEndpointUrl?: string;
    spBearerToken?: string;
  };
}

export async function POST(req: NextRequest) {
  let body: RequestBody;

  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { fileName, data, storageConfig } = body;

  if (!fileName || !Array.isArray(data) || !storageConfig) {
    return NextResponse.json(
      { error: "Missing required fields: fileName, data, storageConfig" },
      { status: 400 }
    );
  }

  const bytes = new Uint8Array(data);
  const result = await exportDotLottie(bytes, fileName, storageConfig);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ location: result.location }, { status: 200 });
}
