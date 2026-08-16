# Releasing Revival Launcher

The Windows build produces two installers:

- **MSI**: use for manual installs or managed/business deployment. MSI does not provide reliable in-place Electron auto-updates.
- **NSIS setup `.exe`**: use for normal end users. It receives automatic updates from GitHub Releases.

## One-time GitHub setup

1. Create a **public** GitHub repository and push this project to it. GitHub's updater feed is public; a private repository needs a separate authenticated update server.
2. In GitHub, open **Settings → Actions → General** and allow workflows to create and approve pull requests / write repository contents if your organization policy requires it.
3. Enable GitHub Actions. The included workflow has permission to create GitHub Releases using the repository `GITHUB_TOKEN`.

## Publish an update

1. Increase `version` in `package.json` (for example, `0.1.0` → `0.1.1`). The Git tag and package version must match.
2. Commit and push the version change.
3. Create and push a tag: `git tag v0.1.1` then `git push origin v0.1.1`.
4. GitHub Actions builds the MSI and the NSIS setup installer, uploads both to the GitHub Release, and includes the update metadata required by installed NSIS copies.

For a local, non-publishing build, set the repository values first and run `npm run dist`:

```powershell
$env:GH_OWNER = 'your-github-user-or-org'
$env:GH_REPO = 'your-repository-name'
npm.cmd run dist
```

The installers are written to `dist`. Share the **NSIS `.exe`** with regular users so future releases install automatically; share the MSI only when an MSI is specifically required.
