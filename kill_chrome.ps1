Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'chrome.exe' -and $_.CommandLine -match 'remote-debugging-port' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
Write-Host "Cleared flutter chrome debug instances."
