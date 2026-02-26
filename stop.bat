@echo off
title CRAVE - Stopping
echo.
echo  Stopping all CRAVE services...
docker-compose down
echo.
echo  All services stopped.
echo.
pause
