# Launch Script for Sea Turtle DSS Docker Application
Write-Host "Starting Sea Turtle Conservation DSS in Docker..." -ForegroundColor Cyan

docker build -t sea-turtle-dss .
docker stop sea_turtle_dss_app 2>$null
docker rm sea_turtle_dss_app 2>$null

docker run -d -p 8080:80 --name sea_turtle_dss_app sea-turtle-dss

Write-Host "Application launched successfully!" -ForegroundColor Green
Write-Host "Opening http://localhost:8080 in your default web browser..." -ForegroundColor Yellow

Start-Process "http://localhost:8080"
