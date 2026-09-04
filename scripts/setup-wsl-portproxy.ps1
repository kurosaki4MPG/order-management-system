param(
  [int]$ListenPort = 3000,
  [string]$ListenAddress = "0.0.0.0",
  [string]$FirewallRuleName = "OMS WSL Next.js Dev 3000"
)

$ErrorActionPreference = "Stop"

function Write-Info([string]$Message) {
  Write-Host "[info] $Message"
}

function Write-Warn([string]$Message) {
  Write-Host "[warn] $Message"
}

Write-Info "Getting WSL IPv4 address."
$wslOutput = & wsl.exe -e sh -lc "hostname -I"
if ($null -eq $wslOutput) {
  throw "Failed to get WSL IPv4 address. Make sure WSL is running."
}

$wslIp = ($wslOutput | Out-String).Trim().Split(" ")[0]

if ([string]::IsNullOrWhiteSpace($wslIp)) {
  throw "Failed to get WSL IPv4 address. Make sure WSL is running."
}

Write-Info "WSL IP: $wslIp"
Write-Info ("Resetting portproxy and adding {0}:{1} -> {2}:{1}." -f $ListenAddress, $ListenPort, $wslIp)

& netsh interface portproxy delete v4tov4 listenaddress=$ListenAddress listenport=$ListenPort | Out-Null
& netsh interface portproxy add v4tov4 listenaddress=$ListenAddress listenport=$ListenPort connectaddress=$wslIp connectport=$ListenPort

Write-Info "Checking Windows Firewall inbound rule."
$existingRule = Get-NetFirewallRule -DisplayName $FirewallRuleName -ErrorAction SilentlyContinue

if (-not $existingRule) {
  New-NetFirewallRule `
    -DisplayName $FirewallRuleName `
    -Direction Inbound `
    -Action Allow `
    -Protocol TCP `
    -LocalPort $ListenPort `
    -Profile Private | Out-Null
  Write-Info "Firewall rule added."
} else {
  Write-Info "Firewall rule already exists."
}

Write-Info "Current portproxy entries:"
& netsh interface portproxy show v4tov4

Write-Warn 'Start Next.js in WSL with: npm run dev -- -H 0.0.0.0 --experimental-https'
Write-Warn 'Then open https://192.168.3.8:3000 in the browser.'
Write-Info "Done."
