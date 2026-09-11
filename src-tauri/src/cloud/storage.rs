use super::auth::load_session;
use super::config::load_cloud_config;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ShareSummary {
    pub id: String,
    pub project_name: String,
    pub share_code: String,
    pub expires_at: String,
    pub created_at: String,
    pub owner_id: String,
}

fn authed_client(access_token: &str) -> Result<reqwest::Client, String> {
    reqwest::Client::builder()
        .default_headers({
            let mut headers = reqwest::header::HeaderMap::new();
            headers.insert(
                "Authorization",
                format!("Bearer {access_token}").parse().map_err(|_| "invalid token")?,
            );
            headers
        })
        .build()
        .map_err(|e| e.to_string())
}

fn function_url(path: &str) -> Result<String, String> {
    let config = load_cloud_config()?;
    Ok(format!("{}/functions/v1/{}", config.supabase_url.trim_end_matches('/'), path))
}

fn require_session() -> Result<super::auth::Session, String> {
    load_session().ok_or_else(|| "Not signed in to AetherPM Cloud.".to_string())
}

/// Uploads a local file to the cloud: asks the broker for a presigned
/// URL (which also checks quota), PUTs the bytes straight to Contabo,
/// then confirms so the server can record the real size. Returns the
/// object key, which the caller can immediately pass to `create_share`.
pub async fn upload_file(local_path: String, file_name: String) -> Result<String, String> {
    let session = require_session()?;
    let bytes = std::fs::read(&local_path).map_err(|e| format!("could not read file: {e}"))?;
    let declared_size = bytes.len() as u64;

    let client = authed_client(&session.access_token)?;

    #[derive(Deserialize)]
    struct UploadUrlResponse {
        #[serde(rename = "uploadUrl")]
        upload_url: String,
        #[serde(rename = "objectKey")]
        object_key: String,
    }

    let resp = client
        .post(function_url("request-upload-url")?)
        .json(&serde_json::json!({ "fileName": file_name, "declaredSizeBytes": declared_size }))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !resp.status().is_success() {
        return Err(extract_error(resp).await);
    }
    let parsed: UploadUrlResponse = resp.json().await.map_err(|e| e.to_string())?;

    // PUT directly to Contabo -- this request does NOT go through
    // Supabase at all, keeping large files off Edge Function compute.
    let put_resp = reqwest::Client::new()
        .put(&parsed.upload_url)
        .body(bytes)
        .send()
        .await
        .map_err(|e| format!("upload to storage failed: {e}"))?;
    if !put_resp.status().is_success() {
        return Err(format!("upload rejected by storage provider (status {})", put_resp.status()));
    }

    // Confirm so the server records the real size against quota.
    let confirm_resp = client
        .post(function_url("confirm-upload")?)
        .json(&serde_json::json!({ "objectKey": parsed.object_key }))
        .send()
        .await
        .map_err(|e| e.to_string())?;
    if !confirm_resp.status().is_success() {
        return Err(extract_error(confirm_resp).await);
    }

    Ok(parsed.object_key)
}

pub async fn create_share(object_key: String, project_name: String, recipient_email: Option<String>) -> Result<String, String> {
    let session = require_session()?;
    let client = authed_client(&session.access_token)?;

    #[derive(Deserialize)]
    struct ShareResponse {
        #[serde(rename = "shareCode")]
        share_code: String,
    }

    let resp = client
        .post(function_url("create-share")?)
        .json(&serde_json::json!({ "objectKey": object_key, "projectName": project_name, "recipientEmail": recipient_email }))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !resp.status().is_success() {
        return Err(extract_error(resp).await);
    }
    let parsed: ShareResponse = resp.json().await.map_err(|e| e.to_string())?;
    Ok(parsed.share_code)
}

pub async fn list_shares() -> Result<Vec<ShareSummary>, String> {
    let session = require_session()?;
    let client = authed_client(&session.access_token)?;

    #[derive(Deserialize)]
    struct ListResponse {
        shares: Vec<ShareSummary>,
    }

    let resp = client.get(function_url("list-shares")?).send().await.map_err(|e| e.to_string())?;
    if !resp.status().is_success() {
        return Err(extract_error(resp).await);
    }
    let parsed: ListResponse = resp.json().await.map_err(|e| e.to_string())?;
    Ok(parsed.shares)
}

/// Resolves a share code to a presigned download URL and saves it to
/// a local temp path, returning that path so the caller can hand it
/// straight to the existing `import_project` command.
pub async fn download_share(share_code: String, dest_path: String) -> Result<(), String> {
    let session = require_session()?;
    let client = authed_client(&session.access_token)?;

    #[derive(Deserialize)]
    struct ResolveResponse {
        #[serde(rename = "downloadUrl")]
        download_url: String,
    }

    let resp = client
        .post(function_url("list-shares")?)
        .json(&serde_json::json!({ "shareCode": share_code }))
        .send()
        .await
        .map_err(|e| e.to_string())?;
    if !resp.status().is_success() {
        return Err(extract_error(resp).await);
    }
    let parsed: ResolveResponse = resp.json().await.map_err(|e| e.to_string())?;

    let file_resp = reqwest::get(&parsed.download_url).await.map_err(|e| e.to_string())?;
    let bytes = file_resp.bytes().await.map_err(|e| e.to_string())?;
    std::fs::write(&dest_path, &bytes).map_err(|e| e.to_string())?;
    Ok(())
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct StorageUsage {
    pub used_bytes: i64,
    pub limit_bytes: i64,
}

/// Reads the caller's own storage_usage row directly via Supabase's
/// PostgREST API. Safe to call with just the user's own JWT (not the
/// service role) because the RLS policy on storage_usage only allows
/// reading your own row -- see supabase/schema.sql.
pub async fn get_storage_usage() -> Result<StorageUsage, String> {
    let session = require_session()?;
    let config = load_cloud_config()?;
    let client = authed_client(&session.access_token)?;

    let url = format!(
        "{}/rest/v1/storage_usage?select=used_bytes,limit_bytes&user_id=eq.{}",
        config.supabase_url.trim_end_matches('/'),
        session.user_id
    );

    let resp = client
        .get(&url)
        .header("apikey", &config.supabase_anon_key)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !resp.status().is_success() {
        return Err(extract_error(resp).await);
    }

    let rows: Vec<StorageUsage> = resp.json().await.map_err(|e| e.to_string())?;
    rows.into_iter().next().ok_or_else(|| "no storage usage row found".to_string())
}

async fn extract_error(resp: reqwest::Response) -> String {
    match resp.json::<serde_json::Value>().await {
        Ok(v) => v.get("message").or(v.get("error")).map(|m| m.to_string()).unwrap_or_else(|| "cloud request failed".into()),
        Err(_) => "cloud request failed".into(),
    }
}
