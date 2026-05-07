$root = $PSScriptRoot

Write-Host "Starting Docker services..." -ForegroundColor Cyan
docker compose --env-file backend/.env up -d

Write-Host "Starting Backend (npm run dev)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root\backend'; npm run dev"

Write-Host "Starting Frontend (npm start)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root\frontend'; npm start"

Write-Host "All services started!" -ForegroundColor Magenta
