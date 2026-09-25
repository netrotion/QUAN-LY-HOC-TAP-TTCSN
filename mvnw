#!/bin/sh
# ----------------------------------------------------------------------------
# Apache Maven Wrapper Startup Script for Unix
# ----------------------------------------------------------------------------

MAVEN_PROJECTBASEDIR="${0%/*}"
[ -z "$MAVEN_PROJECTBASEDIR" ] && MAVEN_PROJECTBASEDIR="."

WRAPPER_JAR="$MAVEN_PROJECTBASEDIR/.mvn/wrapper/maven-wrapper.jar"
WRAPPER_LAUNCHER="org.apache.maven.wrapper.MavenWrapperMain"

if [ -z "$JAVA_HOME" ]; then
  JAVA_EXE="java"
else
  JAVA_EXE="$JAVA_HOME/bin/java"
fi

if [ ! -f "$WRAPPER_JAR" ]; then
  echo "Downloading Maven Wrapper jar..."
  WRAPPER_URL="https://repo.maven.apache.org/maven2/org/apache/maven/wrapper/maven-wrapper/3.3.2/maven-wrapper-3.3.2.jar"
  if command -v curl >/dev/null 2>&1; then
    curl -fsSL "$WRAPPER_URL" -o "$WRAPPER_JAR"
  elif command -v wget >/dev/null 2>&1; then
    wget -q "$WRAPPER_URL" -O "$WRAPPER_JAR"
  fi
fi

exec "$JAVA_EXE" -Dmaven.multiModuleProjectDirectory="$MAVEN_PROJECTBASEDIR" -classpath "$WRAPPER_JAR" "$WRAPPER_LAUNCHER" "$@"
