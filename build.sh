#!/usr/bin/env bash

set -xe

ORIGIN="verdaccio/verdaccio"
MIRROR="hertzg/verdaccio"
PLATFORMS="linux/amd64,linux/386,linux/arm64,linux/ppc64le,linux/arm/v7,linux/arm/v6"

BUILDMAP=$(node ./buildMap.js "$ORIGIN" "$MIRROR")

if [ ! -d './verdaccio/repo' ]; then
  git clone https://github.com/verdaccio/verdaccio.git ./verdaccio/repo
fi

pushd ./verdaccio/repo
git fetch
git reset --hard
git clean -fdx
git checkout master
git pull

while IFS='' read -r line; do
  REVISION=$(jq -r '.[0]' <<<"$line")
  TAGS=$(jq -r '.[1]' <<<"$line")

  git reset --hard
  git clean -fdx
  git checkout "$REVISION"

  docker buildx build \
    $TAGS \
    --platform "$PLATFORMS" \
    --pull \
    --push \
    $@ \
    .

done <<<"$BUILDMAP"
popd
