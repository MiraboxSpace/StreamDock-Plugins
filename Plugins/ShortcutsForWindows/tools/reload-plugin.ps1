# Kills the running plugin process so a new build gets loaded.
# The host app (Fifine Control Deck / StreamDock) notices the disconnect and relaunches the plugin within a few seconds.

$plugin = 'com.mcristoni.windows-shortcuts.sdPlugin'
$processes = @(Get-CimInstance Win32_Process -Filter "Name = 'node20.exe'" |
    Where-Object { $_.CommandLine -like "*$plugin*" })

foreach ($process in $processes) {
    Stop-Process -Id $process.ProcessId -Force
}

if ($processes.Count -eq 0) {
    Write-Output 'Plugin was not running; the host app should start it within a few seconds.'
} else {
    Write-Output 'Plugin stopped; the host app will relaunch it within a few seconds.'
}
