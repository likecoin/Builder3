FROM modmod
RUN apt-get update && apt-get install -y \
  nodejs \
  nodejs-legacy \
  npm
ADD package.json /tmp/package.json
RUN cd /tmp && npm install
RUN cp -a /tmp/node_modules /builder3
WORKDIR /builder3
ADD . /builder3
WORKDIR /
CMD rqworker -u redis://redis:6379