@echo off
echo ===================================================
echo IMIS - Git Repository Initialization & Setup Script
echo ===================================================
echo.

:: Initialize Git if not present
if not exist ".git" (
    echo [1/3] Initializing new Git repository...
    git init
    git branch -M main
) else (
    echo [1/3] Existing Git repository detected.
)

:: Stage and commit
echo [2/3] Staging project files...
git add .
git commit -m "feat: Initial production commit for Industrial Maintenance Intelligence System (IMIS)"

echo.
echo [3/3] Ready for remote upload!
echo.
echo To link and push to your GitHub / GitLab repository, run:
echo   git remote add origin https://github.com/YOUR_USERNAME/IMIS.git
echo   git push -u origin main
echo.
echo ===================================================
pause
