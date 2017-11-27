# builder3

This is the proprietary software for building oice, please refer to LICENSE file for details.

## run

```
$ node builder3.js -e 2.2.1 [src] [dest]
```

## Building docker image for use in oice/kubernetes

!!! Image [modmod](https://github.com/lakoo/oice-server) is required as base !!!

```bash
$ ./build.sh
```

The image will be tagged as `o2rqworker`
