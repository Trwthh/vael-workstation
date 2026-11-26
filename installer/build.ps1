$csc = "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
$wpf = "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\WPF"
$src = Join-Path $PSScriptRoot "Installer.cs"
$root = Split-Path $PSScriptRoot
$out = Join-Path $root "VAEL-Installer.exe"

$refs = @(
    "/r:`"$wpf\PresentationFramework.dll`""
    "/r:`"$wpf\PresentationCore.dll`""
    "/r:`"$wpf\WindowsBase.dll`""
    "/r:System.Xaml.dll"
)

$icoValid = Join-Path $root "build\icon-valid.ico"
$manifest = Join-Path $PSScriptRoot "app.manifest"
$cscArgs = @("/target:winexe", "/optimize+", "/platform:x64") + $refs

if (Test-Path $icoValid) { $cscArgs += "/win32icon:`"$icoValid`"" }
if (Test-Path $manifest) { $cscArgs += "/win32manifest:`"$manifest`"" }

$setupExe = Get-ChildItem $root -Filter "*.exe" | Where-Object {
    $_.Name -match "(?i)setup.*vael|vael.*setup" -and $_.Name -ne "VAEL-Installer.exe"
} | Select-Object -First 1

if ($setupExe) {
    $sizeMB = [math]::Round($setupExe.Length / 1MB)
    Write-Host "Embedding: $($setupExe.Name) - $sizeMB MB" -ForegroundColor Cyan
    $cscArgs += "/resource:`"$($setupExe.FullName)`",VAELSetup.exe"
} else {
    Write-Host "No setup exe found to embed." -ForegroundColor Yellow
}

$cscArgs += "/out:`"$out`""
$cscArgs += "`"$src`""

Write-Host "Compiling..." -ForegroundColor Cyan
& $csc $cscArgs

if ($LASTEXITCODE -eq 0) {
    $finalMB = [math]::Round((Get-Item $out).Length / 1MB, 1)
    Write-Host "Built: $out - $finalMB MB" -ForegroundColor Green
} else {
    Write-Host "Build failed." -ForegroundColor Red
    exit 1
}
