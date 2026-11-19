# รันชุด Playwright กับเว็บรอบ rerun  ใช้: powershell -File run-tests.ps1 [-Bug B01] [-Grep ...]
param([string]$Bug = '', [string]$Out = 'test-report')
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$app = Join-Path $root 'app'
$env:PORT = '3101'; Remove-Item Env:TEST_MODE -EA SilentlyContinue; Remove-Item Env:BUG_MODE -EA SilentlyContinue
$env:DB_PATH = Join-Path $env:TEMP 'rerun-nohook.db'; Remove-Item $env:DB_PATH -EA SilentlyContinue
$b = Start-Process node -ArgumentList 'server.js' -WorkingDirectory $app -PassThru -WindowStyle Hidden
$env:PORT = '3100'; $env:TEST_MODE = '1'; $env:DB_PATH = Join-Path $env:TEMP 'rerun-main.db'; Remove-Item $env:DB_PATH -EA SilentlyContinue
if ($Bug) { $env:BUG_MODE = $Bug }
$a = Start-Process node -ArgumentList 'server.js' -WorkingDirectory $app -PassThru -WindowStyle Hidden
Start-Sleep 3
$env:E2E_NOHOOK_URL = 'http://localhost:3101'
$env:E2E_DB_PATH = $env:DB_PATH
Push-Location (Join-Path $root 'e2e')
npx playwright test 2>&1 | Out-File (Join-Path $root "run-$(if($Bug){$Bug}else{'all'}).txt") -Encoding utf8
Pop-Location
Get-Process -Id $a.Id, $b.Id -EA SilentlyContinue | Stop-Process -Force
