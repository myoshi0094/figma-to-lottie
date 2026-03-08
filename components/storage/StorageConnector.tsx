"use client";

import { useState } from "react";
import type { StorageProvider, StorageConfig } from "@/types";

interface StorageConnectorProps {
  onConnect: (config: StorageConfig) => void;
}

export function StorageConnector({ onConnect }: StorageConnectorProps) {
  const [provider, setProvider] = useState<StorageProvider>("local");
  const [s3Config, setS3Config] = useState({
    region: "",
    bucket: "",
    accessKeyId: "",
    secretAccessKey: "",
  });
  const [spConfig, setSpConfig] = useState({
    tenantId: "",
    clientId: "",
    siteUrl: "",
    driveId: "",
  });

  const handleConnect = () => {
    const config: StorageConfig = {
      provider,
      ...(provider === "s3" && { s3: s3Config }),
      ...(provider === "sharepoint" && { sharePoint: spConfig }),
    };
    onConnect(config);
  };

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-zinc-900">
        Storage Connector
      </h2>

      <div className="mb-4 flex gap-2">
        {(["local", "s3", "sharepoint"] as StorageProvider[]).map((p) => (
          <button
            key={p}
            onClick={() => setProvider(p)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              provider === p
                ? "bg-zinc-900 text-white"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
            }`}
          >
            {p === "s3" ? "AWS S3" : p === "sharepoint" ? "SharePoint" : "Local"}
          </button>
        ))}
      </div>

      {provider === "s3" && (
        <div className="grid grid-cols-2 gap-3">
          {(["region", "bucket", "accessKeyId", "secretAccessKey"] as const).map(
            (field) => (
              <div key={field}>
                <label className="mb-1 block text-xs font-medium text-zinc-500 capitalize">
                  {field.replace(/([A-Z])/g, " $1")}
                </label>
                <input
                  type={field.includes("secret") || field.includes("Key") ? "password" : "text"}
                  value={s3Config[field]}
                  onChange={(e) =>
                    setS3Config((prev) => ({ ...prev, [field]: e.target.value }))
                  }
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none"
                  placeholder={field}
                />
              </div>
            )
          )}
        </div>
      )}

      {provider === "sharepoint" && (
        <div className="grid grid-cols-2 gap-3">
          {(["tenantId", "clientId", "siteUrl", "driveId"] as const).map(
            (field) => (
              <div key={field}>
                <label className="mb-1 block text-xs font-medium text-zinc-500 capitalize">
                  {field.replace(/([A-Z])/g, " $1")}
                </label>
                <input
                  type={field.includes("Id") ? "password" : "text"}
                  value={spConfig[field]}
                  onChange={(e) =>
                    setSpConfig((prev) => ({ ...prev, [field]: e.target.value }))
                  }
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none"
                  placeholder={field}
                />
              </div>
            )
          )}
        </div>
      )}

      {provider === "local" && (
        <p className="text-sm text-zinc-500">
          Files will be downloaded directly to your browser.
        </p>
      )}

      <button
        onClick={handleConnect}
        className="mt-4 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
      >
        Connect
      </button>
    </div>
  );
}
