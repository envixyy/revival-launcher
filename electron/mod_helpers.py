import sys
import os
import json
import re
import urllib.request
import urllib.parse

# Add original RevivalClient directory to path to load modpack modules
sys.path.append(r"C:\Users\vix\Desktop\RevivalClient")

from modpack.importer import ModrinthModpackImporter, ImportProgress
from modpack.manifest import ModpackManifest

FABRIC_META    = "https://meta.fabricmc.net/v2"
QUILT_META     = "https://meta.quiltmc.org/v3"
FORGE_MAVEN    = "https://files.minecraftforge.net/net/minecraftforge/forge/maven-metadata.xml"
NEOFORGE_MAVEN = "https://maven.neoforged.net/releases/net/neoforged/neoforge/maven-metadata.xml"
MODRINTH_API  = "https://api.modrinth.com/v2"

def _fetch_json(url):
    req = urllib.request.Request(url, headers={"User-Agent": "RevivalClient/1.0"})
    with urllib.request.urlopen(req, timeout=10) as r:
        return json.loads(r.read().decode())

def get_fabric_loader_versions(mc_version):
    try:
        data = _fetch_json(f"{FABRIC_META}/versions/loader/{mc_version}")
        return [e["loader"]["version"] for e in data]
    except Exception:
        return []

def get_quilt_loader_versions(mc_version):
    try:
        data = _fetch_json(f"{QUILT_META}/versions/loader/{mc_version}")
        return [e["loader"]["version"] for e in data]
    except Exception:
        return []

def _parse_maven_versions(url):
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "RevivalClient/1.0"})
        with urllib.request.urlopen(req, timeout=10) as r:
            xml = r.read().decode()
        versions = re.findall(r"<version>(.*?)</version>", xml)
        return list(reversed(versions))
    except Exception:
        return []

def get_forge_versions(mc_version):
    versions = _parse_maven_versions(FORGE_MAVEN)
    return [v for v in versions if v.startswith(mc_version + "-")]

def get_neoforge_versions(mc_version):
    versions = _parse_maven_versions(NEOFORGE_MAVEN)
    short = ".".join(mc_version.split(".")[1:])
    return [v for v in versions if v.startswith(short + ".")]

def install_fabric(mc_version, loader_version, minecraft_dir, callback=None):
    import minecraft_launcher_lib
    cb = callback or {}
    if loader_version in ("latest", "", None):
        versions = get_fabric_loader_versions(mc_version)
        loader_version = versions[0] if versions else "latest"
    minecraft_launcher_lib.fabric.install_fabric(
        mc_version, minecraft_dir,
        loader_version=loader_version,
        callback=cb)
    return f"fabric-loader-{loader_version}-{mc_version}"

def install_quilt(mc_version, loader_version, minecraft_dir, callback=None):
    import minecraft_launcher_lib
    cb = callback or {}
    if loader_version in ("latest", "", None):
        versions = get_quilt_loader_versions(mc_version)
        loader_version = versions[0] if versions else "latest"
    minecraft_launcher_lib.quilt.install_quilt(
        mc_version, minecraft_dir,
        loader_version=loader_version,
        callback=cb)
    return f"quilt-loader-{loader_version}-{mc_version}"

def install_forge(mc_version, loader_version, minecraft_dir, callback=None):
    import minecraft_launcher_lib
    cb = callback or {}
    if loader_version in ("latest", "", None):
        versions = get_forge_versions(mc_version)
        if not versions:
            raise RuntimeError(f"No Forge builds found for {mc_version}")
        loader_version = versions[0]
    minecraft_launcher_lib.forge.install_forge_version(
        loader_version, minecraft_dir, callback=cb)
    return loader_version

def install_neoforge(mc_version, loader_version, minecraft_dir, callback=None):
    import minecraft_launcher_lib
    cb = callback or {}
    if loader_version in ("latest", "", None):
        versions = get_neoforge_versions(mc_version)
        if not versions:
            raise RuntimeError(f"No NeoForge builds found for {mc_version}")
        loader_version = versions[0]
    minecraft_launcher_lib.forge.install_forge_version(
        loader_version, minecraft_dir, callback=cb)
    return f"neoforge-{loader_version}"

def get_minecraft_dir():
    home = os.path.expanduser("~")
    if sys.platform == "win32":
        return os.path.join(os.environ.get("APPDATA", home), ".minecraft")
    elif sys.platform == "darwin":
        return os.path.join(home, "Library", "Application Support", "minecraft")
    return os.path.join(home, ".minecraft")

def get_instance_profile_dir(inst):
    name_safe = "".join(c for c in inst.get("name", "default")
                        if c.isalnum() or c in " _-").strip().replace(" ", "_") or "default"
    home = os.path.expanduser("~")
    if sys.platform == "win32":
        base = os.path.join(os.environ.get("APPDATA", home), "RevivalClient", "instances", name_safe)
    elif sys.platform == "darwin":
        base = os.path.join(home, "Library", "Application Support", "RevivalClient", "instances", name_safe)
    else:
        base = os.path.join(home, ".revivalclient", "instances", name_safe)
    return base

def install_minecraft(ver, gdir, cb):
    import minecraft_launcher_lib
    minecraft_launcher_lib.install.install_minecraft_version(ver, gdir, callback=cb)

def install_single_mod(project_id, mc_version, loader, mods_dir):
    loader_slug = { "Fabric": "fabric", "Forge": "forge", "Quilt": "quilt", "NeoForge": "neoforge", "Vanilla": "" }.get(loader, "")
    params = {}
    if mc_version:
        params["game_versions"] = json.dumps([mc_version])
    if loader_slug:
        params["loaders"] = json.dumps([loader_slug])
    
    qs = urllib.parse.urlencode(params) if params else ""
    url = f"{MODRINTH_API}/project/{project_id}/version"
    if qs:
        url += "?" + qs
        
    req = urllib.request.Request(url, headers={"User-Agent": "RevivalClient/1.0"})
    with urllib.request.urlopen(req, timeout=15) as r:
        versions = json.loads(r.read().decode())
        
    if not versions:
        raise Exception(f"No compatible version found for MC {mc_version} {loader}")
        
    compatible = versions[0]
    files = compatible.get("files", [])
    if not files:
        raise Exception("No file found in version")
        
    primary = next((f for f in files if f.get("primary")), files[0])
    dl_url = primary.get("url", "")
    filename = primary.get("filename", "mod.jar")
    dest = os.path.join(mods_dir, filename)
    
    # Download
    print(f"Downloading {filename}...", flush=True)
    req_dl = urllib.request.Request(dl_url, headers={"User-Agent": "RevivalClient/1.0"})
    with urllib.request.urlopen(req_dl, timeout=30) as r_dl:
        os.makedirs(mods_dir, exist_ok=True)
        with open(dest, "wb") as f_out:
            f_out.write(r_dl.read())
            
    # Install dependencies
    deps = compatible.get("dependencies", [])
    if deps:
        required = [d for d in deps if d.get("dependency_type") == "required"]
        for dep in required:
            dep_project_id = dep.get("project_id")
            if dep_project_id:
                try:
                    print(f"Installing dependency project {dep_project_id}...", flush=True)
                    install_single_mod(dep_project_id, mc_version, loader, mods_dir)
                except Exception as ex:
                    print(f"Dependency error for {dep_project_id}: {ex}", flush=True)

def do_import(mrpack_path, ram_mb, workers, existing_names_json):
    existing = json.loads(existing_names_json)
    
    def on_progress(p: ImportProgress):
        print(json.dumps({
            "phase": p.phase,
            "message": p.message,
            "detail": p.detail,
            "percent": p.percent
        }), flush=True)

    importer = ModrinthModpackImporter(
        mrpack_path=mrpack_path,
        get_minecraft_dir=get_minecraft_dir,
        get_instance_profile_dir=get_instance_profile_dir,
        install_minecraft=install_minecraft,
        install_fabric=install_fabric,
        install_quilt=install_quilt,
        install_forge=install_forge,
        install_neoforge=install_neoforge,
        download_workers=int(workers),
        ram_mb=int(ram_mb),
    )
    
    res = importer.import_pack(existing, on_progress=on_progress)
    print(json.dumps({
        "success": True,
        "instance_name": res.instance_name,
        "instance_record": res.instance_record,
        "instance_dir": res.instance_dir
    }))

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: mod_helpers.py <import|install-mod> ...")
        sys.exit(1)
        
    cmd = sys.argv[1]
    if cmd == "import":
        do_import(sys.argv[2], sys.argv[3], sys.argv[4], sys.argv[5])
    elif cmd == "install-mod":
        # install-mod <projectId> <mcVersion> <loader> <modsDir>
        try:
            install_single_mod(sys.argv[2], sys.argv[3], sys.argv[4], sys.argv[5])
            print(json.dumps({"success": True}))
        except Exception as e:
            print(json.dumps({"success": False, "error": str(e)}))
