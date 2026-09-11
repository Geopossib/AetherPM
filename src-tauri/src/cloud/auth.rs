use super::config::load_cloud_config;
use keyring::Entry;
use serde::{Deserialize, Serialize};

const KEYRING_SERVICE: &str = "aetherpm";
const KEYRING_USER: &str = "cloud_session";

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Session {
    pub access_token: String,
    pub refresh_token: String,
    pub user_id: String,
    pub email: String,
}

#[derive(Debug, Deserialize)]
struct AuthTokenResponse {
    access_token: String,
    refresh_token: String,
    user: AuthUser,
}

#[derive(Debug, Deserialize)]
struct AuthUser {
    id: String,
    email: Option<String>,
}

#[derive(Debug, Deserialize)]
struct AuthErrorBody {
    #[serde(alias = "error_description", alias = "msg")]
    message: Option<String>,
}

fn keyring_entry() -> Result<Entry, String> {
    Entry::new(KEYRING_SERVICE, KEYRING_USER).map_err(|e| e.to_string())
}

/// Stores the session in the OS keychain (Keychain on macOS, Credential
/// Manager on Windows, Secret Service on Linux) rather than SQLite or a
/// plaintext file, since these tokens grant real account access.
pub fn save_session(session: &Session) -> Result<(), String> {
    let entry = keyring_entry()?;
    let json = serde_json::to_string(session).map_err(|e| e.to_string())?;
    entry.set_password(&json).map_err(|e| e.to_string())
}

pub fn load_session() -> Option<Session> {
    let entry = keyring_entry().ok()?;
    let json = entry.get_password().ok()?;
    serde_json::from_str(&json).ok()
}

pub fn clear_session() -> Result<(), String> {
    let entry = keyring_entry()?;
    match entry.delete_credential() {
        Ok(()) => Ok(()),
        Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(e.to_string()),
    }
}

async fn auth_request(path: &str, body: serde_json::Value) -> Result<Session, String> {
    let config = load_cloud_config()?;
    let client = reqwest::Client::new();
    let url = format!("{}/auth/v1/{}", config.supabase_url.trim_end_matches('/'), path);

    let resp = client
        .post(&url)
        .header("apikey", &config.supabase_anon_key)
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("network error contacting Supabase: {e}"))?;

    let status = resp.status();
    let text = resp.text().await.map_err(|e| e.to_string())?;

    if !status.is_success() {
        let message = serde_json::from_str::<AuthErrorBody>(&text)
            .ok()
            .and_then(|b| b.message)
            .unwrap_or(text);
        return Err(message);
    }

    let parsed: AuthTokenResponse = serde_json::from_str(&text).map_err(|e| e.to_string())?;
    let session = Session {
        access_token: parsed.access_token,
        refresh_token: parsed.refresh_token,
        user_id: parsed.user.id,
        email: parsed.user.email.unwrap_or_default(),
    };
    save_session(&session)?;
    Ok(session)
}

pub async fn sign_up(email: String, password: String) -> Result<Session, String> {
    auth_request("signup", serde_json::json!({ "email": email, "password": password })).await
}

pub async fn sign_in(email: String, password: String) -> Result<Session, String> {
    auth_request(
        "token?grant_type=password",
        serde_json::json!({ "email": email, "password": password }),
    )
    .await
}

pub async fn sign_out() -> Result<(), String> {
    clear_session()
}
