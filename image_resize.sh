#!/bin/sh

cd $1
find . -type f -iname "*.jpg" -exec mogrify -resize $2 -strip "{}" \;
find . -type f -iname "*.png" -exec mogrify -resize $2 -strip "{}" \;
find . -type f -iname "*.png" -exec pngquant --ext .png --force --speed 1 "{}" \;