# builder3


## run

```
$ node builder3.js -e 2.2.1 [src] [dest]
```

## clone all

```
$ git clone --recursive git@bitbucket.org:kakerukasai/builder3.git
```

## Building docker image for use in oice/kubernetes

!!! Image [modmod](https://github.com/lakoo/modmod) is required as base !!!

```bash
$ ./build.sh
```

The image will be tagged as `o2rqworker`