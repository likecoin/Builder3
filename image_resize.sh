#!/bin/sh

cd $1
mogrify -resize $2 *.jpg
mogrify -resize $2 *.png