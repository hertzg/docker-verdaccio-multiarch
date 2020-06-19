🐋 Verdaccio release docker images (amd and arm builds)
---
This repository contains scripts to support continuous multi-arch builds of 
Verdaccio. You can see the built images at 
[hertzg/verdaccio](https://hub.docker.com/r/hertzg/verdaccio/tags) on dockerhub.

Github workflows builds every release from official github repository and in
addition adds extra `:latest` tag to the latest release. Build happens at
[predefined interval](https://github.com/hertzg/docker-verdaccio-multiarch/blob/master/.github/workflows/buildx.yml)
in addition to every push.

Images support following architectures:
* linux/amd64
* linux/arm/v6
* linux/arm/v7
* linux/arm64

If you need extra architectures feel free to open an issue or pull request.

## Raspberry Pi support
The images contain images built for ARM architectures which means that these
images can be used on at least the following versions of Raspberry Pi:

* RPi 1 Model A
* RPi 1 Model A+
* RPi 3 Model A+
* RPi 1 Model B
* RPi 1 Model B+
* RPi 2 Model B
* RPi 2 Model B v1.2
* RPi 3 Model B
* RPi 3 Model B+
* RPi 4 Model B (:heavy_check_mark: tested) 
* Compute Module 1
* Compute Module 3
* Compute Module 3 Lite
* Compute Module 3+
* Compute Module 3+ Lite
* RPi Zero PCB v1.2
* RPi Zero PCB v1.3
* RPi Zero W

If you have any of those devices and have successfully used the images please
report them and help update this list. :open_hands: 

## Usage

You can use the same commands as you would use for official images, you only
need to replace the `verdaccio/verdaccio` with `hertzg/verdaccio` ot use the 
multiarch images.

```shell script
docker run -it --rm --name verdaccio -p 4873:4873 hertzg/verdaccio
```

For persistence, you can use docker volumes

```shell script
docker volume create verdaccio_conf
docker volume create verdaccio_data
docker volume create verdaccio_plugins
docker run \
  -p 4873:4873 \
  -v verdaccio_conf:/verdaccio/conf \
  -v verdaccio_data:/verdaccio/storage \
  -v verdaccio_plugins:/verdaccio/plugins \
  hertzg/verdaccio
```

Or you can use path bindings

```shell script
V_PATH=/path/for/verdaccio; docker run \
  -p 4873:4873 \
  -v $V_PATH/conf:/verdaccio/conf \
  -v $V_PATH/storage:/verdaccio/storage \
  -v $V_PATH/plugins:/verdaccio/plugins \
  hertzg/verdaccio
```
