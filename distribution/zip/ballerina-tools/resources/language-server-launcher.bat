@echo off

REM ---------------------------------------------------------------------------
REM   Copyright (c) 2017, WSO2 Inc. (http://www.wso2.org) All Rights Reserved.
REM
REM   Licensed under the Apache License, Version 2.0 (the "License");
REM   you may not use this file except in compliance with the License.
REM   You may obtain a copy of the License at
REM
REM   http://www.apache.org/licenses/LICENSE-2.0
REM
REM   Unless required by applicable law or agreed to in writing, software
REM   distributed under the License is distributed on an "AS IS" BASIS,
REM   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
REM   See the License for the specific language governing permissions and
REM   limitations under the License.

rem ---------------------------------------------------------------------------
rem ----------- Startup Script for Ballerina Language Server ------------------
rem ---------------------------------------------------------------------------
rem
rem Environment Variable Prerequisites
rem
rem   BALLERINA_HOME  Home of BALLERINA installation. If not set I will  try
rem                   to figure it out.
rem
rem   JAVA_HOME       Must point at your Java Development Kit installation.
rem
rem   JAVA_OPTS       (Optional) Java runtime options used when the commands
rem                   is executed.
rem ---------------------------------------------------------------------------

rem ----------if JAVA_HOME is not set we're not happy -------------------------


rem ------------------ Developer Configurations -------------------------------
set "BALLERINA_DEBUG_LOG="
set "DEBUG_MODE="
set DEBUG_PORT=5005;
rem ---------------------------------------------------------------------------

rem -------------------------- set BALLERINA_HOME -----------------------------
:checkServer
rem TODO: Validate BALLERINA_HOME
rem %~sdp0 is expanded pathname of the current script under NT with spaces in the path removed
set BALLERINA_HOME=%~sdp0..\..\..\..
goto setJava

:setJava
set "%JAVA_HOME%"="%BALLERINA_HOME%\bre\lib\jre1.8.0_172"
if not exist "%JAVA_HOME%\bin\java.exe" goto checkJavaHome
goto updateClasspath

:checkJava
if "%JAVA_HOME%" == "" goto noJavaHome
if not exist "%JAVA_HOME%\bin\java.exe" goto noJavaHome
goto updateClasspath

:noJavaHome
echo "You must set the JAVA_HOME variable before running Ballerina."
goto end

rem ----- update classpath -----------------------------------------------------
:updateClasspath

setlocal EnableDelayedExpansion
set BALLERINA_CLASSPATH=

set BALLERINA_CLASSPATH=!BALLERINA_CLASSPATH!;"%BALLERINA_HOME%\bre\lib\*"

set BALLERINA_CLASSPATH=!BALLERINA_CLASSPATH!;"%BALLERINA_HOME%\lib\resources\composer\services\*"

rem ----- Process the input command -------------------------------------------

rem Slurp the command line arguments. This loop allows for an unlimited number
rem of arguments (up to the command line limit, anyway).

:setupArgs
if defined JAVA_DEBUG (goto commandDebug) else (goto doneStart) 

rem ----- commandDebug ---------------------------------------------------------
:commandDebug

if not "%JAVA_OPTS%"=="" echo Warning !!!. User specified JAVA_OPTS will be ignored, once you give the --java.debug option.
set JAVA_OPTS=-Xdebug -Xnoagent -Djava.compiler=NONE -Xrunjdwp:transport=dt_socket,server=y,suspend=y,address=%DEBUG_PORT%
echo Please start the remote debugging client to continue...
goto runServer

:noDebugPort
echo Please specify the debug port after the --java.debug option
goto end

:doneStart
if "%OS%"=="Windows_NT" @setlocal
if "%OS%"=="WINNT" @setlocal

rem find the version of the jdk
:findJdk

set CMD=RUN %*

:checkJdk8AndHigher
set JVER=
for /f tokens^=2-5^ delims^=.-_^" %%j in ('"%JAVA_HOME%\bin\java" -fullversion 2^>^&1') do set "JVER=%%j%%k"
if %JVER% EQU 18 goto jdk8
goto unknownJdk

:unknownJdk
echo Ballerina is supported only on JDK 1.8
goto end

:jdk8
goto runServer

rem ----------------- Execute The Requested Command ----------------------------

:runServer

set CMD=%*

rem ---------- Add jars to classpath ----------------

set CMD_LINE_ARGS=-XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath="%BALLERINA_HOME%\language-server-heap-dump.hprof"  -Dcom.sun.management.jmxremote -classpath %BALLERINA_CLASSPATH% -Dballerina.home="%BALLERINA_HOME%"  -Djava.command="%JAVA_HOME%\bin\java" -Djava.opts="%JAVA_OPTS%" -Dballerina.version=0.981.2-SNAPSHOT

:runJava
"%JAVA_HOME%\bin\java" %CMD_LINE_ARGS% org.ballerinalang.langserver.launchers.stdio.Main %CMD%
:end
goto endlocal

:endlocal

:END