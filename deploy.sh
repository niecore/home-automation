#!/bin/bash

docker_host=$1

docker buildx build --file ./Dockerfile --tag niecore/home-automation:latest --push .
DOCKER_HOST=$docker_host docker-compose up -d --build
