#!/bin/sh

# builder directory
cd /builder3
node builder3.js -e 3.6.3-df42c0e $1 $2
