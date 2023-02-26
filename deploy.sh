#!/bin/bash

docker_host=$1

docker buildx build --file ./Dockerfile --tag niecore/home-automation:latest --push .
DOCKER_HOST=$docker_host docker-compose pull
DOCKER_HOST=$docker_host docker-compose --env-file .env up -d --build
