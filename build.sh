#!/usr/bin/env bash

set -e

ORIGIN="verdaccio/verdaccio"
MIRROR="hertzg/verdaccio"
PLATFORMS="linux/amd64,linux/386,linux/arm64,linux/ppc64le,linux/arm/v7,linux/arm/v6"

TOSYNC=$(node ./tagsToSync.js "$ORIGIN" "$MIRROR" | uniq)
TOSYNC="latest $TOSYNC"
for tag in $TOSYNC; do
  docker buildx build \
    --platform "$PLATFORMS" \
    --pull \
    --progress plain \
    --push \
    --build-arg "version=$tag" \
    --tag "$MIRROR:$tag" \
    "$@" \
    ./verdaccio &
done
wait
