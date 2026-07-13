@echo off
setlocal
set "COMMIT_MSG=%~1"
if "%COMMIT_MSG%"=="" set "COMMIT_MSG=chore: automated build and online sync"

echo ===============================================
echo  LessonCraft MY Automated Build ^& Deploy
echo ===============================================

echo [1/3] Building production bundle in ./frontend...
cd frontend
call npm run build
if errorlevel 1 (
    echo Frontend build failed! Aborting deploy.
    exit /b 1
)

cd ..
echo [2/3] Staging and committing changes...
git add .
git commit -m "%COMMIT_MSG%"

echo [3/3] Pushing to origin main...
git push origin main
if errorlevel 1 (
    echo Git push failed!
    exit /b 1
)

echo SUCCESS! Changes built and pushed to origin main.
echo Note: Live server will complete deployment in ~1-2 minutes.
endlocal
