import { invoke } from "@tauri-apps/api/core";

export interface CloudSession {
  access_token: string;
  refresh_token: string;
  user_id: string;
  email: string;
}

export interface ShareSummary {
  id: string;
  project_name: string;
  share_code: string;
  expires_at: string;
  created_at: string;
  owner_id: string;
}

export interface StorageUsage {
  used_bytes: number;
  limit_bytes: number;
}

export const cloudApi = {
  signUp: (email: string, password: string) => invoke<CloudSession>("cloud_sign_up", { email, password }),
  signIn: (email: string, password: string) => invoke<CloudSession>("cloud_sign_in", { email, password }),
  signOut: () => invoke<void>("cloud_sign_out"),
  currentSession: () => invoke<CloudSession | null>("cloud_current_session"),

  shareProject: (exportedFilePath: string, projectName: string, recipientEmail: string | null) =>
    invoke<string>("cloud_share_project", { exportedFilePath, projectName, recipientEmail }),
  listShares: () => invoke<ShareSummary[]>("cloud_list_shares"),
  downloadShare: (shareCode: string, destPath: string) => invoke<void>("cloud_download_share", { shareCode, destPath }),
  storageUsage: () => invoke<StorageUsage>("cloud_storage_usage"),
};

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
