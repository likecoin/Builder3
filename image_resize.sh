#!/bin/sh

cd $1
mogrify -resize $2 -strip *.jpg
mogrify -resize $2 -strip *.png