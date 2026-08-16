// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Serialize, Deserialize};
use std::fs::{self, File};
use std::io::Write;
use std::path::{Path, PathBuf};
use chrono::Utc;
use thiserror::Error;

#[derive(Error, Debug, Serialize)]
pub enum LauncherError {
    #[error("IO error: {0}")]
    Io(String),
    #[error("Serialization error: {0}")]
    Serialization(String),
    #[error("Instance not found")]
    NotFound,
}

impl From<std::io::Error> for LauncherError {
    fn from(err: std::io::Error) -> Self {
        Self::Io(err.to_string())
    }
}

impl From<serde_json::Error> for LauncherError {
    fn from(err: serde_json::Error) -> Self {
        Self::Serialization(err.to_string())
    }
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct InstanceManifest {
    pub name: String,
    pub mc_version: String,
    pub loader: String,
    pub loader_version: String,
    pub java_path: Option<String>,
    pub jvm_args: Option<String>,
    pub min_memory: Option<u32>,
    pub max_memory: Option<u32>,
    pub last_played: Option<String>,
}

fn get_instances_dir() -> Result<PathBuf, LauncherError> {
    let mut path = dirs::data_dir().ok_or_else(|| LauncherError::Io("Could not find data directory".into()))?;
    path.push("RevivalLauncher");
    path.push("instances");
    if !path.exists() {
        fs::create_dir_all(&path)?;
    }
    Ok(path)
}

#[tauri::command]
fn create_instance(
    name: String,
    mc_version: String,
    loader: String,
    loader_version: String,
) -> Result<InstanceManifest, LauncherError> {
    let instances_dir = get_instances_dir()?;
    let safe_name = name.replace(|c: char| !c.is_alphanumeric(), "_");
    let instance_path = instances_dir.join(&safe_name);
    
    if instance_path.exists() {
        return Err(LauncherError::Io("Instance directory already exists".into()));
    }

    fs::create_dir_all(&instance_path)?;
    fs::create_dir_all(instance_path.join("mods"))?;
    fs::create_dir_all(instance_path.join("resourcepacks"))?;
    fs::create_dir_all(instance_path.join("saves"))?;

    let manifest = InstanceManifest {
        name,
        mc_version,
        loader,
        loader_version,
        java_path: None,
        jvm_args: Some("-XX:+UseG1GC -XX:+UnlockExperimentalVMOptions -XX:G1NewSizePercent=20 -XX:G1ReservePercent=20 -XX:MaxGCPauseMillis=50 -XX:G1HeapRegionSize=32M".to_string()),
        min_memory: Some(2048),
        max_memory: Some(4096),
        last_played: None,
    };

    let manifest_path = instance_path.join("instance.json");
    let mut file = File::create(manifest_path)?;
    let json = serde_json::to_string_pretty(&manifest)?;
    file.write_all(json.as_bytes())?;

    Ok(manifest)
}

#[tauri::command]
fn list_instances() -> Result<Vec<InstanceManifest>, LauncherError> {
    let instances_dir = get_instances_dir()?;
    let mut instances = Vec::new();

    if instances_dir.exists() {
        for entry in fs::read_dir(instances_dir)? {
            let entry = entry?;
            let path = entry.path();
            if path.is_dir() {
                let manifest_path = path.join("instance.json");
                if manifest_path.exists() {
                    let file = File::open(manifest_path)?;
                    let manifest: InstanceManifest = serde_json::from_reader(file)?;
                    instances.push(manifest);
                }
            }
        }
    }

    Ok(instances)
}

#[tauri::command]
fn detect_java() -> Result<Vec<String>, LauncherError> {
    let mut paths = Vec::new();
    
    // Check common locations on Windows
    #[cfg(target_os = "windows")]
    {
        let common_paths = vec![
            r"C:\Program Files\Java",
            r"C:\Program Files (x86)\Java",
            r"C:\Program Files\Eclipse Adoptium",
        ];
        
        for base in common_paths {
            let path = Path::new(base);
            if path.exists() {
                if let Ok(entries) = fs::read_dir(path) {
                    for entry in entries {
                        if let Ok(entry) = entry {
                            let java_exe = entry.path().join("bin").join("java.exe");
                            if java_exe.exists() {
                                paths.push(java_exe.to_string_lossy().to_string());
                            }
                        }
                    }
                }
            }
        }
    }

    // Check environment variables/PATH
    if let Ok(path_var) = std::env::var("PATH") {
        for part in std::env::split_paths(&path_var) {
            let java_exe = part.join("java");
            #[cfg(target_os = "windows")]
            let java_exe = part.join("java.exe");
            
            if java_exe.exists() {
                paths.push(java_exe.to_string_lossy().to_string());
            }
        }
    }

    paths.dedup();
    Ok(paths)
}

#[tauri::command]
fn launch_instance(name: String) -> Result<String, LauncherError> {
    // Stub launcher command
    // In a real application, this parses minecraft libraries, builds classpaths,
    // verifies session token, and executes std::process::Command with JVM arguments.
    let instances_dir = get_instances_dir()?;
    let safe_name = name.replace(|c: char| !c.is_alphanumeric(), "_");
    let instance_path = instances_dir.join(&safe_name);

    if !instance_path.exists() {
        return Err(LauncherError::NotFound);
    }

    let manifest_path = instance_path.join("instance.json");
    let mut manifest: InstanceManifest = serde_json::from_reader(File::open(&manifest_path)?)?;
    
    // Update last played timestamp
    manifest.last_played = Some(Utc::now().to_rfc3339());
    let mut file = File::create(manifest_path)?;
    let json = serde_json::to_string_pretty(&manifest)?;
    file.write_all(json.as_bytes())?;

    Ok(format!("Launching instance '{}'...", manifest.name))
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            create_instance,
            list_instances,
            detect_java,
            launch_instance
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
