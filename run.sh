#!/bin/bash
docker run -d \
  --name container-central \
  -p 8086:8088 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  davescodemusings/container-central:latest
