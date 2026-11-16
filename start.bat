@echo off
title Ruhunu Billing System
echo =======================================================
echo   Starting Ruhunu Billing System (රුහුණු බිල්පත් පද්ධතිය)
echo   Single Database File: data\ruhunubilling.db.json
echo   Real-time Synced Billing Web Application
echo =======================================================
echo.
echo Opening browser at http://localhost:3000 ...
start http://localhost:3000
node server.js
pause
