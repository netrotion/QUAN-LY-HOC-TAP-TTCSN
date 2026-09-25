@REM ----------------------------------------------------------------------------
@REM Licensed to the Apache Software Foundation (ASF) under one
@REM or more contributor license agreements.  See the NOTICE file
@REM distributed with this work for additional information
@REM regarding copyright ownership.  The ASF licenses this file
@REM to you under the Apache License, Version 2.0 (the
@REM "License"); you may not use this file except in compliance
@REM with the License.  You may obtain a copy of the License at
@REM
@REM    https://www.apache.org/licenses/LICENSE-2.0
@REM
@REM Unless required by applicable law or agreed to in writing,
@REM software distributed under the License is distributed on an
@REM "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
@REM KIND, either express or implied.  See the License for the
@REM specific language governing permissions and limitations
@REM under the License.
@REM ----------------------------------------------------------------------------

@REM ----------------------------------------------------------------------------
@REM Apache Maven Wrapper Startup Batch script, version 3.3.2
@REM ----------------------------------------------------------------------------

@IF "%DEBUG%"=="" @ECHO OFF
@SETLOCAL LEAVE_ARGS

SET ERROR_CODE=0

@REM Set local scope for the variables with windows NT shell
IF "%OS%"=="Windows_NT" @SETLOCAL

@REM ==== START VALIDATION ====
IF NOT "%JAVA_HOME%" == "" GOTO OkJHome

FOR %%i IN (java.exe) DO SET JAVA_EXE=%%~$PATH:i
IF NOT "%JAVA_EXE%" == "" GOTO OkJExe

ECHO.
ECHO Error: JAVA_HOME is not defined correctly.
ECHO We cannot execute java.exe
ECHO.
GOTO error

:OkJHome
SET JAVA_EXE="%JAVA_HOME%\bin\java.exe"

:OkJExe
IF NOT EXIST %JAVA_EXE% (
  ECHO.
  ECHO Error: JAVA_HOME is set to an invalid directory.
  ECHO JAVA_HOME = "%JAVA_HOME%"
  ECHO Please set the JAVA_HOME variable in your environment to match the
  ECHO location of your Java installation.
  ECHO.
  GOTO error
)

@REM ==== END VALIDATION ====

SET MAVEN_PROJECTBASEDIR=%~dp0
IF "%MAVEN_PROJECTBASEDIR:~-1%"=="\" SET MAVEN_PROJECTBASEDIR=%MAVEN_PROJECTBASEDIR:~0,-1%

SET WRAPPER_JAR="%MAVEN_PROJECTBASEDIR%\.mvn\wrapper\maven-wrapper.jar"
SET WRAPPER_LAUNCHER=org.apache.maven.wrapper.MavenWrapperMain

IF EXIST %WRAPPER_JAR% GOTO runWrapper

ECHO Downloading Maven Wrapper...
SET WRAPPER_URL=https://repo.maven.apache.org/maven2/org/apache/maven/wrapper/maven-wrapper/3.3.2/maven-wrapper-3.3.2.jar
powershell -Command "& {[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; (New-Object System.Net.WebClient).DownloadFile('%WRAPPER_URL%', '%WRAPPER_JAR%')}"

:runWrapper
%JAVA_EXE% %JVM_CONFIG_MAVEN_PROPS% -Dmaven.multiModuleProjectDirectory="%MAVEN_PROJECTBASEDIR%" -classpath %WRAPPER_JAR% %WRAPPER_LAUNCHER% %*
IF ERRORLEVEL 1 GOTO error
GOTO end

:error
SET ERROR_CODE=1

:end
@REM End local scope for the variables with windows NT shell
IF "%OS%"=="Windows_NT" ENDLOCAL

EXIT /B %ERROR_CODE%
