export type StorageProvider = "s3" | "sharepoint" | "local";

export interface LottieAnimation {
  id: string;
  name: string;
  data: unknown;
  createdAt: Date;
  updatedAt: Date;
}

export interface DotLottieFile {
  id: string;
  name: string;
  animations: LottieAnimation[];
  storageProvider: StorageProvider;
  storageKey?: string;
}

export interface S3Config {
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
}

export interface SharePointConfig {
  tenantId: string;
  clientId: string;
  siteUrl: string;
  driveId: string;
}

export interface StorageConfig {
  provider: StorageProvider;
  s3?: S3Config;
  sharePoint?: SharePointConfig;
}

export interface ExportOptions {
  format: "lottie" | "dotlottie";
  optimize: boolean;
  targetProvider: StorageProvider;
}
