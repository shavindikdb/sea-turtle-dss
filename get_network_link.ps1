# Sea Turtle DSS - Network IP Link Finder
$wifiIp = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -like "*Wi-Fi*" } | Select-Object -ExpandProperty IPAddress -First 1)

if (-not $wifiIp) {
    $wifiIp = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "172.29.*" } | Select-Object -ExpandProperty IPAddress -First 1)
}

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " SEA TURTLE DSS - MULTI-DEVICE LOCAL ACCESS " -ForegroundColor Yellow
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Open any browser on your Phone, Tablet, or Laptop connected to the same Wi-Fi:" -ForegroundColor White
Write-Host " Direct Mobile / Wi-Fi URL:   http://$wifiIp" -ForegroundColor Green
Write-Host " Alternative Port URL:        http://$wifiIp:8080" -ForegroundColor Green
Write-Host " Local Computer URL:          http://localhost:8080" -ForegroundColor Green
Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
