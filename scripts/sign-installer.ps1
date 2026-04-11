param(
    [string]$InstallerPath = "./release/One Moment Setup 0.1.0.exe",
    [string]$PfxPath,
    [string]$Password,
    [string]$Thumbprint,
    [string]$StorePath = "Cert:\CurrentUser\My",
    [string]$TimeStampUrl = "http://timestamp.digicert.com"
)

$ErrorActionPreference = "Stop"

function Get-SignToolPath {
    $command = Get-Command signtool.exe -ErrorAction SilentlyContinue
    if ($command) {
        return $command.Source
    }

    $sdkTool = Get-ChildItem "C:\Program Files (x86)\Windows Kits\10\bin" -Recurse -Filter signtool.exe -ErrorAction SilentlyContinue |
        Where-Object { $_.FullName -match "\\x64\\signtool.exe$" } |
        Sort-Object FullName -Descending |
        Select-Object -First 1 -ExpandProperty FullName

    if (-not $sdkTool) {
        throw "signtool.exe non trovato. Installa il Windows SDK o aggiungi signtool al PATH."
    }

    return $sdkTool
}

function Resolve-InstallerPath([string]$PathValue) {
    $resolved = Resolve-Path $PathValue -ErrorAction SilentlyContinue
    if (-not $resolved) {
        throw "Installer non trovato: $PathValue"
    }

    return $resolved.Path
}

function Build-SignArguments {
    param(
        [string]$Installer,
        [string]$Timestamp,
        [string]$CertificatePath,
        [string]$CertificatePassword,
        [string]$CertificateThumbprint,
        [string]$CertificateStorePath
    )

    $arguments = @(
        "sign",
        "/fd", "SHA256",
        "/td", "SHA256",
        "/tr", $Timestamp
    )

    if ($CertificatePath) {
        $arguments += @("/f", $CertificatePath)
        if ($CertificatePassword) {
            $arguments += @("/p", $CertificatePassword)
        }
    }
    elseif ($CertificateThumbprint) {
        $arguments += @("/sha1", $CertificateThumbprint, "/sm")

        if ($CertificateStorePath -like "Cert:\CurrentUser\*") {
            $arguments = $arguments | Where-Object { $_ -ne "/sm" }
        }
    }
    else {
        throw "Specifica un certificato tramite -PfxPath oppure -Thumbprint."
    }

    $arguments += $Installer
    return $arguments
}

$signToolPath = Get-SignToolPath
$resolvedInstaller = Resolve-InstallerPath $InstallerPath

if ($PfxPath) {
    $resolvedPfx = Resolve-Path $PfxPath -ErrorAction SilentlyContinue
    if (-not $resolvedPfx) {
        throw "Certificato PFX non trovato: $PfxPath"
    }
    $PfxPath = $resolvedPfx.Path
}

$signArguments = Build-SignArguments `
    -Installer $resolvedInstaller `
    -Timestamp $TimeStampUrl `
    -CertificatePath $PfxPath `
    -CertificatePassword $Password `
    -CertificateThumbprint $Thumbprint `
    -CertificateStorePath $StorePath

Write-Host "Uso signtool:" $signToolPath
Write-Host "Firma installer:" $resolvedInstaller

& $signToolPath @signArguments

if ($LASTEXITCODE -ne 0) {
    throw "signtool ha restituito codice $LASTEXITCODE"
}

Get-AuthenticodeSignature $resolvedInstaller |
    Select-Object Status, StatusMessage, @{ Name = "Signer"; Expression = { $_.SignerCertificate.Subject } } |
    Format-List