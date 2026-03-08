import { Client } from "@microsoft/microsoft-graph-client";
import type { SharePointConfig } from "@/types";

export function createGraphClient(accessToken: string): Client {
  return Client.init({
    authProvider: (done) => {
      done(null, accessToken);
    },
  });
}

export async function uploadToSharePoint(
  client: Client,
  config: SharePointConfig,
  fileName: string,
  content: Uint8Array
): Promise<string> {
  const uploadPath = `/drives/${config.driveId}/root:/${fileName}:/content`;
  const response = await client.api(uploadPath).put(content.buffer);
  return response.id as string;
}

export async function downloadFromSharePoint(
  client: Client,
  config: SharePointConfig,
  fileId: string
): Promise<Uint8Array> {
  const stream = await client
    .api(`/drives/${config.driveId}/items/${fileId}/content`)
    .get();
  return new Uint8Array(await stream.arrayBuffer());
}

export async function listSharePointFiles(
  client: Client,
  config: SharePointConfig,
  folderPath = ""
): Promise<Array<{ id: string; name: string }>> {
  const path = folderPath
    ? `/drives/${config.driveId}/root:/${folderPath}:/children`
    : `/drives/${config.driveId}/root/children`;

  const response = await client.api(path).get();
  return (response.value as Array<{ id: string; name: string }>) ?? [];
}
