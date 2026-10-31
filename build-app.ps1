param([string]$DevEcoHome='E:\DevEco Studio',[string]$SdkHome='E:\DevEco Studio\sdk')
$ErrorActionPreference='Stop'
$env:DEVECO_SDK_HOME=$SdkHome
Push-Location $PSScriptRoot
try {
 $taskInputHash = & (Join-Path $DevEcoHome 'tools\node\node.exe') (Join-Path $PSScriptRoot 'tools\source-proof.cjs') fingerprint
 if($LASTEXITCODE -ne 0){throw 'Source fingerprint failed'}
 & (Join-Path $DevEcoHome 'tools\node\node.exe') (Join-Path $DevEcoHome 'tools\hvigor\bin\hvigorw.js') --mode project -p product=default assembleApp --no-daemon
 if($LASTEXITCODE -ne 0){throw 'Hvigor build failed'}
 & (Join-Path $DevEcoHome 'tools\node\node.exe') (Join-Path $PSScriptRoot 'tools\source-proof.cjs') record $taskInputHash
 if($LASTEXITCODE -ne 0){throw 'Source/APP proof failed'}
} finally {Pop-Location}
