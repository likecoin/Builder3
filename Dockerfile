FROM modmod:latest
RUN mkdir /builder3
RUN apk --no-cache add \
  nodejs
ADD package.json /tmp/package.json
RUN cd /tmp && npm install
RUN mv /tmp/node_modules /builder3/node_modules
WORKDIR /builder3
ADD . /builder3
WORKDIR /
CMD rqworker -u redis://redis:6379