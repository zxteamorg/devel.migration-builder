[![Docker Build Status](https://img.shields.io/docker/cloud/build/zxteamorg/devel.migration-builder?label=Build%20Status)](https://hub.docker.com/r/zxteamorg/devel.migration-builder/builds)
[![Docker Image Version](https://img.shields.io/docker/v/zxteamorg/devel.migration-builder?sort=date&label=Version)](https://hub.docker.com/r/zxteamorg/devel.migration-builder/tags)
[![Docker Image Size](https://img.shields.io/docker/image-size/zxteamorg/devel.migration-builder?label=Image%20Size)](https://hub.docker.com/r/zxteamorg/devel.migration-builder/tags)
[![Docker Pulls](https://img.shields.io/docker/pulls/zxteamorg/devel.migration-builder?label=Pulls)](https://hub.docker.com/r/zxteamorg/devel.migration-builder)
[![Docker Pulls](https://img.shields.io/docker/stars/zxteamorg/devel.migration-builder?label=Docker%20Stars)](https://hub.docker.com/r/zxteamorg/devel.migration-builder)
[![Docker Automation](https://img.shields.io/docker/cloud/automated/zxteamorg/devel.migration-builder?label=Docker%20Automation)](https://hub.docker.com/r/zxteamorg/devel.migration-builder/builds)

# Migration Builder

*Migration Builder* - is a processor of [Mustache](https://mustache.github.io/) based SQL script templates.

# Image reason

TDB

# Spec

## Environment variables

* `VERSION_FROM` = version from
* `VERSION_TO` = version to
* `ENV` - target environment name
* `DEVEL` - true/false. Set mustache context variable `isDevelopmentBuild`.

## Volumes

* `/data` - Root your database work directory

# Inside

* Alpine Linux
* NodeJS
* Migration Builder JS Script

# Launch

```bash
docker run --interactive --tty --rm --volume /path/to/database/workdir:/data zxteamorg/devel.migration-builder
```

# Support

* Maintained by: [ZXTeam](https://zxteam.org)
* Where to get help: [Telegram Channel](https://t.me/zxteamorg)
