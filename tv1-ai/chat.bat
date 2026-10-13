@echo off
chcp 65001 >nul
cd /d "%~dp0\.."
mvnw.cmd -pl tv1-ai compile exec:java
