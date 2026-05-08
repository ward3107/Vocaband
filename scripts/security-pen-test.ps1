# =============================================================================
# Security pen-test — PowerShell port of scripts/security-pen-test.sh
#
# Verifies the audit-fix migrations are live and the /api/* auth gates added
# in the 2026-05-08 Phase 5 pass haven't regressed.
#
# Usage (PowerShell 5.1+ / PowerShell 7+):
#
#   $env:SUPABASE_URL = "https://auth.vocaband.com"
#   $env:ANON_KEY     = "sb_publishable_..."
#   $env:APP_URL      = "https://www.vocaband.com"   # optional
#   ./scripts/security-pen-test.ps1
#
# Or one-liner:
#
#   ./scripts/security-pen-test.ps1 `
#     -SupabaseUrl "https://auth.vocaband.com" `
#     -AnonKey "sb_publishable_..." `
#     -AppUrl "https://www.vocaband.com"
#
# Falls back to reading VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY from
# .env.local in the project root if no args + no env vars are given.
#
# Nothing this script does is destructive — every request SHOULD be rejected.
# If any test FAILs, that gate didn't deploy and there's a real exploit window.
# =============================================================================

[CmdletBinding()]
param(
    [string]$SupabaseUrl = $env:SUPABASE_URL,
    [string]$AnonKey     = $env:ANON_KEY,
    [string]$AppUrl      = $env:APP_URL
)

# ── Fallback: read .env.local if values weren't passed ───────────────
if ((-not $SupabaseUrl -or -not $AnonKey) -and (Test-Path ".env.local")) {
    $envFile = Get-Content ".env.local"
    foreach ($line in $envFile) {
        if ($line -match '^\s*VITE_SUPABASE_URL\s*=\s*"?([^"\r\n]+)"?\s*$' -and -not $SupabaseUrl) {
            $SupabaseUrl = $Matches[1]
        }
        if ($line -match '^\s*VITE_SUPABASE_ANON_KEY\s*=\s*"?([^"\r\n]+)"?\s*$' -and -not $AnonKey) {
            $AnonKey = $Matches[1]
        }
    }
}

if (-not $SupabaseUrl -or -not $AnonKey) {
    Write-Host "ERROR: SUPABASE_URL and ANON_KEY must be set." -ForegroundColor Red
    Write-Host "  Either pass -SupabaseUrl/-AnonKey, set env vars, or fill in .env.local."
    exit 1
}

Write-Host "Target: $SupabaseUrl"
if ($AppUrl) { Write-Host "App:    $AppUrl" }
Write-Host ""

$script:Pass = 0
$script:Fail = 0

function Check {
    param([string]$Name, [string]$Pattern, [string]$Body)
    if ($Body -match $Pattern) {
        Write-Host "  PASS  $Name" -ForegroundColor Green
        $script:Pass++
    } else {
        Write-Host "  FAIL  $Name" -ForegroundColor Red
        Write-Host "        body: $Body"
        $script:Fail++
    }
}

# Helper: run an HTTP request and return the body as a string. Errors return
# the response body (Supabase rejects with JSON error bodies, not transport
# errors), so we surface those for pattern matching.
function Invoke-Anon {
    param(
        [string]$Method = "GET",
        [string]$Url,
        [string]$Body = $null,
        [hashtable]$Headers = @{}
    )
    $allHeaders = @{
        "apikey"        = $AnonKey
        "Authorization" = "Bearer $AnonKey"
    }
    foreach ($k in $Headers.Keys) { $allHeaders[$k] = $Headers[$k] }

    try {
        if ($Body) {
            $resp = Invoke-WebRequest -Method $Method -Uri $Url -Headers $allHeaders `
                -Body $Body -ContentType "application/json" -SkipHttpErrorCheck
        } else {
            $resp = Invoke-WebRequest -Method $Method -Uri $Url -Headers $allHeaders `
                -SkipHttpErrorCheck
        }
        return $resp.Content
    } catch {
        return $_.Exception.Message
    }
}

# ─── 1: anon forging another student's progress ─────────────────────
Write-Host "[1] Anon forging save_student_progress_batch"
$body = Invoke-Anon -Method POST `
    -Url "$SupabaseUrl/rest/v1/rpc/save_student_progress_batch" `
    -Body '{"p_batch":[{"student_uid":"victim-uid","class_code":"ABC123","assignment_id":"00000000-0000-0000-0000-000000000000","mode":"classic","score":9999,"student_name":"hacker"}]}'
Check "anon save_progress is rejected" "Authentication required|permission denied|42501|not allowed" $body

# ─── 2: anon enumerating teacher_profiles ────────────────────────────
Write-Host "[2] Anon enumerating teacher_profiles"
$body = Invoke-Anon -Url "$SupabaseUrl/rest/v1/teacher_profiles?select=email,school_name"
Check "anon teacher_profiles returns empty" "^\s*\[\s*\]\s*$" $body

# ─── 3: anon enumerating quick_play_joins ────────────────────────────
Write-Host "[3] Anon enumerating quick_play_joins"
$body = Invoke-Anon -Url "$SupabaseUrl/rest/v1/quick_play_joins?select=session_code,student_name"
Check "anon quick_play_joins returns empty" "^\s*\[\s*\]\s*$" $body

# ─── 4: anon inserting into quick_play_joins ─────────────────────────
Write-Host "[4] Anon inserting into quick_play_joins"
$body = Invoke-Anon -Method POST `
    -Url "$SupabaseUrl/rest/v1/quick_play_joins" `
    -Body '{"session_code":"FAKE99","student_name":"spam"}'
Check "anon insert is rejected" "row-level security|violates|permission denied|42501" $body

# ─── 5: anon enumerating bagrut_tests ─────────────────────────────────
Write-Host "[5] Anon enumerating bagrut_tests"
$body = Invoke-Anon -Url "$SupabaseUrl/rest/v1/bagrut_tests?select=id"
Check "anon bagrut_tests returns empty" "^\s*\[\s*\]\s*$" $body

# ─── 6: anon enumerating bagrut_responses ─────────────────────────────
Write-Host "[6] Anon enumerating bagrut_responses"
$body = Invoke-Anon -Url "$SupabaseUrl/rest/v1/bagrut_responses?select=id"
Check "anon bagrut_responses returns empty" "^\s*\[\s*\]\s*$" $body

# ─── 7: anon enumerating bagrut_cache ─────────────────────────────────
Write-Host "[7] Anon enumerating bagrut_cache"
$body = Invoke-Anon -Url "$SupabaseUrl/rest/v1/bagrut_cache?select=cache_key"
Check "anon bagrut_cache returns empty" "^\s*\[\s*\]\s*$" $body

# ─── 8: anon inserting bagrut_tests ───────────────────────────────────
Write-Host "[8] Anon inserting bagrut_tests"
$body = Invoke-Anon -Method POST `
    -Url "$SupabaseUrl/rest/v1/bagrut_tests" `
    -Body '{"teacher_uid":"00000000-0000-0000-0000-000000000000","module":"B","title":"hack","source_words":["x"],"content":{}}'
Check "anon bagrut_tests insert is rejected" "row-level security|violates|permission denied|42501" $body

# ─── 9: anon inserting bagrut_cache ───────────────────────────────────
Write-Host "[9] Anon inserting bagrut_cache"
$body = Invoke-Anon -Method POST `
    -Url "$SupabaseUrl/rest/v1/bagrut_cache" `
    -Body '{"cache_key":"hack","module":"B","model":"x","content":{}}'
Check "anon bagrut_cache insert is rejected" "row-level security|violates|permission denied|42501" $body

# ─── App-server pen-tests (optional) ──────────────────────────────────
if ($AppUrl) {
    Write-Host ""
    Write-Host "── App-server checks (APP_URL=$AppUrl) ──"

    function Get-Status {
        param([string]$Method = "GET", [string]$Url, [string]$Body = $null)
        try {
            if ($Body) {
                $resp = Invoke-WebRequest -Method $Method -Uri $Url -Body $Body `
                    -ContentType "application/json" -SkipHttpErrorCheck
            } else {
                $resp = Invoke-WebRequest -Method $Method -Uri $Url -SkipHttpErrorCheck
            }
            return [string]$resp.StatusCode
        } catch {
            return "ERR"
        }
    }

    Write-Host "[10] Anon GET /api/version"
    $status = Get-Status -Url "$AppUrl/api/version"
    Check "anon /api/version returns 401" "^401$" $status

    Write-Host "[11] Anon GET /api/ocr/status"
    $status = Get-Status -Url "$AppUrl/api/ocr/status"
    Check "anon /api/ocr/status returns 401" "^401$" $status

    Write-Host "[12] Anon GET /api/ocr/diagnostic"
    $status = Get-Status -Url "$AppUrl/api/ocr/diagnostic"
    Check "anon /api/ocr/diagnostic returns 401" "^401$" $status

    Write-Host "[13] Anon POST /api/submit-bagrut"
    $status = Get-Status -Method POST -Url "$AppUrl/api/submit-bagrut" -Body '{"test_id":"x","answers":{}}'
    Check "anon /api/submit-bagrut returns 401" "^401$" $status

    Write-Host "[14] Anon GET /api/student-bagrut/x"
    $status = Get-Status -Url "$AppUrl/api/student-bagrut/x"
    Check "anon /api/student-bagrut returns 401" "^401$" $status

    Write-Host "[15] Security headers on /api/health"
    try {
        $resp = Invoke-WebRequest -Uri "$AppUrl/api/health" -SkipHttpErrorCheck
        $headerDump = ($resp.Headers.GetEnumerator() | ForEach-Object {
            "$($_.Key): $($_.Value -join ',')"
        }) -join "`n"
        Check "HSTS header present"            "(?i)Strict-Transport-Security"      $headerDump
        Check "X-Frame-Options header present" "(?i)X-Frame-Options"                 $headerDump
        Check "X-Content-Type-Options nosniff" "(?i)X-Content-Type-Options:.*nosniff" $headerDump
    } catch {
        Check "headers fetch ok" "never-matches" $_.Exception.Message
    }
}

Write-Host ""
Write-Host "Results: $($script:Pass) passed, $($script:Fail) failed."
if ($script:Fail -eq 0) { exit 0 } else { exit 1 }
