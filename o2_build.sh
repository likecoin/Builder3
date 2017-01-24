#!/bin/sh

# builder directory
cd /builder3
node builder3.js -e 3.6.0-20fa84e $1 $2
