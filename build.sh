#!/bin/bash
case $(uname -m) in
  arm*) docker build -t davescodemusings/container-central:latest . ;;
  x86*) docker build -t davescodemusings/container-central:x86 . ;;
  *) echo "Error: Unknown architecture" ;;
esac