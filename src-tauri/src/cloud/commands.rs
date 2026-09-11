use super::auth::{self, Session};
use super::storage::{self, ShareSummary, StorageUsage};

#[tauri::command]
pub async fn cloud_sign_up(email: String, password: String) -> Result<Session, String> {
    auth::sign_up(email, password).await
}

#[tauri::command]
pub async fn cloud_sign_in(email: String, password: String) -> Result<Session, String> {
    auth::sign_in(email, password).await
}

#[tauri::command]
pub async fn cloud_sign_out() -> Result<(), String> {
    auth::sign_out().await
}

#[tauri::command]
pub fn cloud_current_session() -> Option<Session> {
    auth::load_session()
}

/// Exports a project locally (reusing the existing export_project
/// command's output format) then uploads it and creates a share.
/// Takes the already-exported file path so it doesn't duplicate the
/// export logic in commands::export.
#[tauri::command]
pub async fn cloud_share_project(
    exported_file_path: String,
    project_name: String,
    recipient_email: Option<String>,
) -> Result<String, String> {
    let file_name = format!("{}.json", project_name.replace(' ', "_"));
    let object_key = storage::upload_file(exported_file_path, file_name).await?;
    storage::create_share(object_key, project_name, recipient_email).await
}

#[tauri::command]
pub async fn cloud_list_shares() -> Result<Vec<ShareSummary>, String> {
    storage::list_shares().await
}

#[tauri::command]
pub async fn cloud_download_share(share_code: String, dest_path: String) -> Result<(), String> {
    storage::download_share(share_code, dest_path).await
}

#[tauri::command]
pub async fn cloud_storage_usage() -> Result<StorageUsage, String> {
    storage::get_storage_usage().await
}
