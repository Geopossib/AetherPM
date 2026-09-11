use serde::Deserialize;
use std::path::PathBuf;

#[derive(Debug, Deserialize, Clone)]
pub struct CloudConfig {
    pub supabase_url: String,
    pub supabase_anon_key: String,
}

fn config_path() -> PathBuf {
    let mut dir = dirs::data_dir().expect("could not resolve platform data directory");
    dir.push("aetherpm");
    dir.push("cloud_config.toml");
    dir
}

/// Loads the Supabase project URL + anon key from a local config file.
/// This is deliberately NOT compiled into the binary: the anon key is
/// safe to be public (it's protected by Row Level Security, not
/// secrecy), but keeping it in a config file means a single build of
/// AetherPM can point at different Supabase projects (e.g. your own
/// self-hosted deployment) without recompiling.
pub fn load_cloud_config() -> Result<CloudConfig, String> {
    let path = config_path();
    if !path.exists() {
        // Write a template so a non-coder has something to fill in
        // rather than a cryptic "file not found."
        if let Some(parent) = path.parent() {
            let _ = std::fs::create_dir_all(parent);
        }
        let _ = std::fs::write(
            &path,
            "# Fill these in from your Supabase project settings, then restart AetherPM.\nsupabase_url = \"\"\nsupabase_anon_key = \"\"\n",
        );
        return Err("Cloud isn't configured yet. Edit cloud_config.toml in your AetherPM data folder and restart the app.".into());
    }

    let contents = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let config: CloudConfig = toml::from_str(&contents).map_err(|e| e.to_string())?;
    if config.supabase_url.is_empty() || config.supabase_anon_key.is_empty() {
        return Err("cloud_config.toml is present but incomplete — fill in supabase_url and supabase_anon_key.".into());
    }
    Ok(config)
}
