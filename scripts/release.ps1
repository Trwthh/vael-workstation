# One-command release: bump version, build, publish to https://updates.trwhub.com/vael-workstation
# Usage: powershell -ExecutionPolicy Bypass -File scripts\release.ps1 [-Bump patch|minor|major|none] [-SkipDeploy]
param(
    [ValidateSet('patch', 'minor', 'major', 'none')][string]$Bump = 'patch',
    [switch]$SkipDeploy
)
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot
$site = Join-Path $root 'updates-site'
$feed = Join-Path $site 'public\vael-workstation'
$archive = 'D:\Archive\VAEL Workstation\update-feed'
$feedUrl = 'https://updates.trwhub.com/vael-workstation'
Set-Location $root

if ($Bump -ne 'none') { npm version $Bump --no-git-tag-version | Out-Null }
$version = (Get-Content package.json -Raw | ConvertFrom-Json).version
Write-Host "Releasing v$version" -ForegroundColor Cyan

pnpm run build
if ($LASTEXITCODE) { throw 'build failed' }
npx electron-builder --win nsis
if ($LASTEXITCODE) { throw 'electron-builder failed' }

$setup = Join-Path $root "release\VAEL-Workstation-$version-Setup.exe"
foreach ($f in @($setup, "$setup.blockmap", (Join-Path $root 'release\latest.yml'))) {
    if (-not (Test-Path $f)) { throw "missing build output: $f" }
}

# Old installers leave the feed but are archived, never deleted.
New-Item -ItemType Directory -Force $feed, $archive | Out-Null
Get-ChildItem $feed -File | Where-Object { $_.Name -notlike "*$version*" -and $_.Name -ne 'latest.yml' } |
    ForEach-Object { Move-Item $_.FullName (Join-Path $archive $_.Name) -Force }
Copy-Item $setup, "$setup.blockmap", (Join-Path $root 'release\latest.yml') $feed -Force

if ($SkipDeploy) { Write-Host "Built v$version into $feed (deploy skipped)"; return }

Push-Location $site
try {
    vercel deploy --prod --yes
    if ($LASTEXITCODE) { throw 'vercel deploy failed' }
} finally { Pop-Location }

$live = (Invoke-WebRequest "$feedUrl/latest.yml" -UseBasicParsing).Content
if ($live -notmatch "version: $([regex]::Escape($version))") { throw "live latest.yml does not show v$version" }
Write-Host "Live: $feedUrl/latest.yml shows v$version" -ForegroundColor Green
