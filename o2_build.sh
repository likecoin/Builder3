#!/bin/sh

# builder directory
cd /builder3
node builder3.js -e 3.5.0-7042d80 $1 $2
