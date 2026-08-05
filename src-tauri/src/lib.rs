use keyring::Entry;
use serde::Serialize;

/// Serialized as a tagged union so the frontend receives a structured error it
/// can branch on, rather than a stringified message it has to pattern-match.
/// `apps/web/src/lib/commands.ts` mirrors this shape. The messages themselves
/// are written to be actionable — never surface a raw driver/transport error.
#[derive(Debug, Serialize, thiserror::Error)]
#[serde(tag = "kind", content = "message", rename_all = "snake_case")]
pub enum CommandError {
    #[error("{0}")]
    InvalidInput(String),
    #[error("{0}")]
    NotFound(String),
    #[error("{0}")]
    Internal(String),
}

impl CommandError {
    fn internal(err: impl std::fmt::Display) -> Self {
        Self::Internal(err.to_string())
    }
}

pub type CommandResult<T> = Result<T, CommandError>;

// Secrets live in the OS keychain, not in app files and not in the cloud — the
// own-your-data half of the DNA. One entry per key; a missing key reads back as
// `None` rather than an error, so callers don't branch on error text.
const KEYCHAIN_SERVICE: &str = "com.example.post_conjurer";

fn secret_entry(key: &str) -> CommandResult<Entry> {
    if key.trim().is_empty() {
        return Err(CommandError::InvalidInput("secret key must not be empty".into()));
    }
    Entry::new(KEYCHAIN_SERVICE, key).map_err(CommandError::internal)
}

#[tauri::command]
fn store_secret(key: String, value: String) -> CommandResult<()> {
    secret_entry(&key)?
        .set_password(&value)
        .map_err(CommandError::internal)
}

#[tauri::command]
fn get_secret(key: String) -> CommandResult<Option<String>> {
    match secret_entry(&key)?.get_password() {
        Ok(value) => Ok(Some(value)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(err) => Err(CommandError::internal(err)),
    }
}

#[tauri::command]
fn delete_secret(key: String) -> CommandResult<()> {
    match secret_entry(&key)?.delete_credential() {
        Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
        Err(err) => Err(CommandError::internal(err)),
    }
}

#[derive(Serialize)]
pub struct AppInfo {
    name: String,
    version: String,
    platform: String,
}

#[tauri::command]
fn get_app_info() -> CommandResult<AppInfo> {
    Ok(AppInfo {
        name: env!("CARGO_PKG_NAME").to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        platform: std::env::consts::OS.to_string(),
    })
}

#[tauri::command]
fn greet(name: &str) -> CommandResult<String> {
    let name = name.trim();
    if name.is_empty() {
        return Err(CommandError::InvalidInput("name must not be empty".into()));
    }
    Ok(format!("Hello, {name}! You've been greeted from Rust."))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            get_app_info,
            greet,
            store_secret,
            get_secret,
            delete_secret
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
