FROM modmod:latest
RUN mkdir /builder3
WORKDIR /builder3
RUN apk --no-cache add \
  nodejs \
  npm \
	&& apk --no-cache add 'pngquant' --repository http://nl.alpinelinux.org/alpine/edge/community
ADD package.json /builder3/package.json
RUN npm install
ADD . /builder3
WORKDIR /
CMD rqworker -u redis://redis:6379