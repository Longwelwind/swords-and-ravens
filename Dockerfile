# To make sure Dokku realizes that this is a Docker buildpack,
# a Dockerfile file needs to be present at the root.
# Dokku will be configured to pick up the right Dockerfile to build
FROM alpine

RUN echo "This Dockerfile is not supposed to be built"
RUN echo "Use \"dokku docker-options:add node-js-app build '--file Dockerfile.dokku'\" to set the Dokku building to a custom image"
RUN false