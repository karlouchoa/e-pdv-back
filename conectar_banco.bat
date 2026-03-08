@echo off
title Tunel SSH - GoldPDV (Porta 5433)
echo Conectando ao servidor 103.199.184.26...
echo Mantenha esta janela aberta para o Prisma funcionar.
echo.

ssh -i "C:\Users\Administrador\.ssh\karlouchoa_rsa" -L 5433:127.0.0.1:15532 user@103.199.184.26

pause