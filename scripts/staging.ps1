<#
.SYNOPSIS
  Runs a production-like copy of NextStep on this machine behind HTTPS, to check a release before it is deployed.

.DESCRIPTION
  start   Builds the API jar, this app, and the static site, then starts them on 127.0.0.1 only:
            API      the jar with SPRING_PROFILES_ACTIVE=production on port 8081, production rate limits, the
                     nextstep_staging database in the development PostgreSQL cluster, and SMTP to Mailpit
            app      next start on port 3200 with APP_HTTPS=true, built into .next-staging; it forwards /api/v1 to
                     the API
            Caddy    https://app.nextstep.localhost:8443 (the app) and https://nextstep.localhost:8443 (the site)
            Mailpit  SMTP on 127.0.0.1:1025 and the inbox at http://127.0.0.1:8025, unless it is already running
  stop    Stops what start started.
  status  Shows what is running.

  The browser reaches only Caddy, which handles TLS and the forwarding headers the way a hosting provider's proxy does
  (staging/Caddyfile). Logs and process IDs go to %LOCALAPPDATA%\NextStep\staging. A new IDENTIFIER_HASH_KEY is
  generated on every start and never written to disk.

  Needs JDK 25, pnpm, the development database (..\nextstep-api\scripts\db-dev.ps1 start), the nextstep-api and
  nextstep repositories next to this one (or NEXTSTEP_API_DIR and NEXTSTEP_SITE_DIR), and Caddy and Mailpit
  (CADDY_PATH and MAILPIT_PATH, on PATH, or under %LOCALAPPDATA%\NextStep\tools).

.PARAMETER Fresh
  Drops and recreates the nextstep_staging database first. That also clears its rate-limit counters, which each run of
  pnpm test:staging partly uses up.

.PARAMETER SkipBuild
  Starts the existing builds instead of rebuilding the API jar, the app, and the site.

.EXAMPLE
  .\scripts\staging.ps1 start -Fresh
  pnpm test:staging
  .\scripts\staging.ps1 stop
#>
param(
    [Parameter(Position = 0)]
    [ValidateSet('start', 'stop', 'status')]
    [string]$Command = 'status',
    [switch]$Fresh,
    [switch]$SkipBuild
)

$ErrorActionPreference = 'Stop'
$appDir = Split-Path -Parent $PSScriptRoot
$reposDir = Split-Path -Parent $appDir
$apiDir = if ($env:NEXTSTEP_API_DIR) { $env:NEXTSTEP_API_DIR } else { Join-Path $reposDir 'nextstep-api' }
$siteDir = if ($env:NEXTSTEP_SITE_DIR) { $env:NEXTSTEP_SITE_DIR } else { Join-Path $reposDir 'nextstep' }
. (Join-Path $apiDir 'scripts\NextStepEnv.ps1')

$stateDir = Join-Path $env:LOCALAPPDATA 'NextStep\staging'
$stateFile = Join-Path $stateDir 'processes.json'
$database = 'nextstep_staging'
$httpsPort = 8443
$apiPort = 8081
$appPort = 3200
$appOrigin = "https://app.nextstep.localhost:$httpsPort"
$siteOrigin = "https://nextstep.localhost:$httpsPort"
$appDistDir = '.next-staging'

# API settings staging must not inherit from this shell, for example after run-api.ps1 -RelaxedLimits.
$inheritedApiSettings = @(
    'DEMO_RATE_LIMIT_PER_HOUR', 'DEMO_GLOBAL_RATE_LIMIT_PER_HOUR', 'REGISTER_RATE_LIMIT_PER_HOUR',
    'REGISTER_EMAIL_RATE_LIMIT_PER_HOUR', 'LOGIN_RATE_LIMIT_PER_WINDOW', 'EMAIL_REQUEST_RATE_LIMIT_PER_HOUR',
    'EMAIL_REQUEST_EMAIL_RATE_LIMIT_PER_HOUR', 'LINK_RATE_LIMIT_PER_WINDOW', 'PASSWORD_CHECK_RATE_LIMIT_PER_WINDOW',
    'EXPORT_RATE_LIMIT_PER_HOUR', 'EMAIL_GLOBAL_LIMIT_PER_HOUR', 'SESSION_TIMEOUT', 'COOKIE_SECURE', 'FLYWAY_ENABLED',
    'PASSWORD_BREACH_CHECK', 'UNVERIFIED_ACCOUNT_TTL', 'DELETION_LEDGER_RETENTION', 'DEMO_TTL_HOURS', 'MAIL_USERNAME',
    'MAIL_PASSWORD', 'MAX_REQUEST_BYTES', 'MAX_CONCURRENT_PASSWORD_HASHES')

function Find-Tool([string]$Name, [string]$Variable, [string]$ToolsPath) {
    $configured = [Environment]::GetEnvironmentVariable($Variable)
    if ($configured) {
        if (Test-Path -LiteralPath $configured) { return $configured }
        throw "$Variable points to a file that doesn't exist: $configured"
    }
    $onPath = Get-Command $Name -ErrorAction SilentlyContinue
    if ($onPath) { return $onPath.Source }
    $local = Join-Path $env:LOCALAPPDATA "NextStep\tools\$ToolsPath"
    if (Test-Path -LiteralPath $local) { return $local }
    throw "$Name not found. Install it, put it on PATH, or set $Variable to the executable."
}

function Test-Listening([int]$Port) {
    return $null -ne (Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue)
}

# Runs a script block with extra environment variables that last only for the call. A $null value removes a variable.
# The script block sees the caller's variables, so this function's own names are prefixed to avoid shadowing them.
function Invoke-WithEnvironment([hashtable]$WithVariables, [scriptblock]$WithBlock) {
    $withSaved = @{}
    foreach ($withName in $WithVariables.Keys) {
        $withSaved[$withName] = [Environment]::GetEnvironmentVariable($withName)
        Set-ProcessVariable $withName $WithVariables[$withName]
    }
    try {
        & $WithBlock
    } finally {
        foreach ($withName in $withSaved.Keys) { Set-ProcessVariable $withName $withSaved[$withName] }
    }
}

# PowerShell passes $null to .NET string parameters as "", which would leave an empty variable behind, so removal goes
# through the Env: drive.
function Set-ProcessVariable([string]$VariableName, $VariableValue) {
    if ($null -eq $VariableValue) {
        Remove-Item -LiteralPath "Env:$VariableName" -ErrorAction SilentlyContinue
    } else {
        Set-Item -LiteralPath "Env:$VariableName" -Value $VariableValue
    }
}

function Start-Background([string]$Name, [string]$FilePath, [string[]]$Arguments, [string]$Directory, [hashtable]$Variables) {
    $options = @{
        FilePath = $FilePath
        ArgumentList = @($Arguments | ForEach-Object { if ($_ -match '\s') { '"' + $_ + '"' } else { $_ } })
        WorkingDirectory = $Directory
        WindowStyle = 'Hidden'
        PassThru = $true
        RedirectStandardOutput = Join-Path $stateDir "$Name.log"
        RedirectStandardError = Join-Path $stateDir "$Name.error.log"
    }
    $process = Invoke-WithEnvironment $Variables { Start-Process @options }
    return [pscustomobject]@{ name = $Name; id = $process.Id; started = $process.StartTime.ToUniversalTime().Ticks; process = $process }
}

function Wait-Http([string]$Name, [string]$Url, [int]$Seconds, $Entry) {
    $uri = [Uri]$Url
    $resolve = @()
    if ($uri.Host.EndsWith('.localhost')) { $resolve = @('--resolve', ($uri.Host + ':' + $uri.Port + ':127.0.0.1')) }
    $deadline = (Get-Date).AddSeconds($Seconds)
    while ((Get-Date) -lt $deadline) {
        if ($Entry -and $Entry.process.HasExited) {
            throw "$Name stopped while starting. See $($Entry.name).log and $($Entry.name).error.log in $stateDir."
        }
        $code = & curl.exe --silent --insecure --output NUL --max-time 5 --write-out '%{http_code}' @resolve $Url
        if ($code -eq '200') { return }
        Start-Sleep -Milliseconds 500
    }
    throw "$Name didn't answer $Url within $Seconds seconds. See the logs in $stateDir."
}

function Save-State($Entries) {
    $records = @($Entries | ForEach-Object { [pscustomobject]@{ name = $_.name; id = $_.id; started = $_.started } })
    ConvertTo-Json -InputObject @{ processes = $records } -Depth 3 | Set-Content -LiteralPath $stateFile
}

function Read-State {
    if (Test-Path -LiteralPath $stateFile) { return Get-Content -LiteralPath $stateFile -Raw | ConvertFrom-Json }
    return $null
}

# A recorded process counts only while its start time (UTC ticks) still matches, so a reused process ID is never stopped.
function Test-Recorded($Record) {
    $process = Get-Process -Id $Record.id -ErrorAction SilentlyContinue
    return $null -ne $process -and $process.StartTime.ToUniversalTime().Ticks -eq [long]$Record.started
}

function Invoke-Psql($Secrets, [string]$Sql) {
    $psql = Join-Path (Get-NextStepPgBin) 'psql.exe'
    $result = Invoke-WithEnvironment @{ PGPASSWORD = $Secrets.superPassword } {
        & $psql -X -q -t -A -v ON_ERROR_STOP=1 -h 127.0.0.1 -p $Secrets.port -U $Secrets.superUser -d postgres -c $Sql
    }
    if ($LASTEXITCODE -ne 0) { throw "psql failed: $Sql" }
    return $result
}

function Initialize-Database($Secrets) {
    & (Join-Path (Get-NextStepPgBin) 'pg_isready.exe') -q -h 127.0.0.1 -p $Secrets.port
    if ($LASTEXITCODE -ne 0) {
        throw 'The development database is not running. Start it with ..\nextstep-api\scripts\db-dev.ps1 start'
    }
    $exists = Invoke-Psql $Secrets "SELECT 1 FROM pg_database WHERE datname = '$database'"
    if ($exists -and $Fresh) {
        Invoke-Psql $Secrets "DROP DATABASE $database WITH (FORCE)" | Out-Null
        $exists = $null
        Write-Output "Dropped the $database database."
    }
    if (-not $exists) {
        Invoke-Psql $Secrets "CREATE DATABASE $database OWNER $($Secrets.appUser)" | Out-Null
        Write-Output "Created the $database database."
    }
}

function Invoke-Build([string]$Name, [string]$Directory, [hashtable]$Variables, [scriptblock]$Step) {
    Write-Output "Building the $Name..."
    $log = Join-Path $stateDir "build-$Name.log"
    Push-Location $Directory
    try {
        Invoke-WithEnvironment $Variables { & $Step 2>&1 | Out-File -LiteralPath $log -Encoding utf8 }
        if ($LASTEXITCODE -ne 0) {
            Get-Content -LiteralPath $log -Tail 30 | Write-Output
            throw "Building the $Name failed. Full log: $log"
        }
    } finally {
        Pop-Location
    }
}

function Start-Staging {
    if (Read-State) { throw 'Staging is already running. Run .\scripts\staging.ps1 stop first.' }
    foreach ($port in @($httpsPort, $apiPort, $appPort)) {
        if (Test-Listening $port) { throw "Port $port is already in use." }
    }
    $caddy = Find-Tool 'caddy' 'CADDY_PATH' 'caddy\caddy.exe'
    $mailpit = Find-Tool 'mailpit' 'MAILPIT_PATH' 'mailpit\mailpit.exe'
    $node = (Get-Command node).Source
    $javaHome = Get-NextStepJavaHome
    $secrets = Get-NextStepSecrets
    New-Item -ItemType Directory -Force -Path $stateDir | Out-Null
    Initialize-Database $secrets

    if (-not $SkipBuild) {
        Invoke-Build 'API' $apiDir @{ JAVA_HOME = $javaHome } { & .\mvnw.cmd -q -DskipTests package }
        Invoke-Build 'app' $appDir @{ NEXT_DIST_DIR = $appDistDir; API_ORIGIN = "http://127.0.0.1:$apiPort";
            NEXT_PUBLIC_SITE_URL = $siteOrigin; NEXT_TELEMETRY_DISABLED = '1' } { & pnpm build }
        Invoke-Build 'website' $siteDir @{ SITE_ENV = 'production'; SITE_PUBLIC_ORIGIN = $siteOrigin;
            PUBLIC_APP_URL = "$appOrigin/register"; PUBLIC_DEMO_URL = "$appOrigin/demo"; NEXT_TELEMETRY_DISABLED = '1' } { & pnpm build }
    }
    $jar = Get-ChildItem -LiteralPath (Join-Path $apiDir 'target') -Filter 'nextstep-api-*.jar' -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -notmatch '(plain|sources|javadoc)\.jar$' } | Select-Object -First 1
    if (-not $jar) { throw 'No API jar in nextstep-api\target. Run start without -SkipBuild.' }
    if (-not (Test-Path -LiteralPath (Join-Path $appDir "$appDistDir\BUILD_ID"))) { throw 'No staging build of the app. Run start without -SkipBuild.' }
    if (-not (Test-Path -LiteralPath (Join-Path $siteDir 'out\index.html'))) { throw 'No website build. Run start without -SkipBuild.' }

    $apiVariables = @{
        SPRING_PROFILES_ACTIVE = 'production'
        SERVER_ADDRESS = '127.0.0.1'
        PORT = "$apiPort"
        DATABASE_URL = "jdbc:postgresql://127.0.0.1:$($secrets.port)/$database"
        DATABASE_USER = $secrets.appUser
        DATABASE_PASSWORD = $secrets.appPassword
        APP_PUBLIC_ORIGIN = $appOrigin
        IDENTIFIER_HASH_KEY = New-NextStepSecret
        MAIL_MODE = 'smtp'
        MAIL_HOST = '127.0.0.1'
        MAIL_PORT = '1025'
        MAIL_SMTP_AUTH = 'false'
        MAIL_STARTTLS = 'false'
        MAIL_FROM = 'NextStep <no-reply@nextstep.test>'
    }
    foreach ($name in $inheritedApiSettings) { $apiVariables[$name] = $null }
    $caddyVariables = @{
        NEXTSTEP_CADDY_STORAGE = (Join-Path $stateDir 'caddy') -replace '\\', '/'
        NEXTSTEP_SITE_ROOT = (Join-Path $siteDir 'out') -replace '\\', '/'
        NEXTSTEP_HTTP_PORT = '8480'
        NEXTSTEP_HTTPS_PORT = "$httpsPort"
        NEXTSTEP_APP_PORT = "$appPort"
    }
    $appVariables = @{ NODE_ENV = 'production'; APP_HTTPS = 'true'; NEXT_DIST_DIR = $appDistDir; NEXT_TELEMETRY_DISABLED = '1' }
    $nextCli = Join-Path $appDir 'node_modules\next\dist\bin\next'

    $started = [System.Collections.Generic.List[object]]::new()
    try {
        if (-not (Test-Listening 1025)) {
            $entry = Start-Background 'mailpit' $mailpit @('--smtp', '127.0.0.1:1025', '--listen', '127.0.0.1:8025') $stateDir @{}
            $started.Add($entry)
            Wait-Http 'Mailpit' 'http://127.0.0.1:8025/api/v1/info' 30 $entry
        }
        # Java's internal sockets on Windows fail under a temp path with spaces; the API's own scripts use %PUBLIC% too.
        $javaArguments = @("-Djdk.net.unixdomain.tmpdir=$env:PUBLIC", '-jar', $jar.FullName)
        $entry = Start-Background 'api' (Join-Path $javaHome 'bin\java.exe') $javaArguments $apiDir $apiVariables
        $started.Add($entry)
        Wait-Http 'The API' "http://127.0.0.1:$apiPort/actuator/health/readiness" 180 $entry
        $entry = Start-Background 'app' $node @($nextCli, 'start', '--port', "$appPort", '--hostname', '127.0.0.1') $appDir $appVariables
        $started.Add($entry)
        Wait-Http 'The app' "http://127.0.0.1:$appPort/login" 60 $entry
        $caddyArguments = @('run', '--config', (Join-Path $appDir 'staging\Caddyfile'), '--adapter', 'caddyfile')
        $entry = Start-Background 'caddy' $caddy $caddyArguments $stateDir $caddyVariables
        $started.Add($entry)
        Wait-Http 'Caddy' "$appOrigin/login" 30 $entry
        Wait-Http 'Caddy' "$siteOrigin/" 30 $entry
    } catch {
        Save-State $started
        Stop-Staging
        throw
    }
    Save-State $started
    Write-Output ''
    Write-Output "Staging is running. Browsers will warn about the certificate from Caddy's local authority."
    Write-Output "  App      $appOrigin"
    Write-Output "  Website  $siteOrigin"
    Write-Output '  Inbox    http://127.0.0.1:8025'
    Write-Output "  API      http://127.0.0.1:$apiPort/actuator/health/readiness (not reachable through the public origin)"
    Write-Output "  Logs     $stateDir"
}

function Stop-Staging {
    $state = Read-State
    if (-not $state) {
        Write-Output 'Staging is not running.'
        return
    }
    foreach ($record in @($state.processes)) {
        if (Test-Recorded $record) {
            & taskkill.exe /PID $record.id /T /F | Out-Null
            Write-Output "Stopped $($record.name)."
        }
    }
    Remove-Item -LiteralPath $stateFile -Force
}

function Show-Status {
    $state = Read-State
    if (-not $state) {
        Write-Output 'Staging is not running.'
        return
    }
    foreach ($record in @($state.processes)) {
        $status = if (Test-Recorded $record) { "running (process $($record.id))" } else { 'stopped' }
        Write-Output ('{0,-8} {1}' -f $record.name, $status)
    }
    Write-Output "App $appOrigin, website $siteOrigin, inbox http://127.0.0.1:8025"
}

switch ($Command) {
    'start' { Start-Staging }
    'stop' { Stop-Staging }
    'status' { Show-Status }
}

