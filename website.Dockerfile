FROM node:16 AS build-client
# Build the client of the game
WORKDIR /app

COPY ./agot-bg-game-server/package.json . 
COPY ./agot-bg-game-server/yarn.lock . 
RUN yarn install --frozen-lockfile

COPY ./agot-bg-game-server/ .

ENV ASSET_PATH=https://swords-and-ravens.ams3.cdn.digitaloceanspaces.com/

RUN yarn run generate-json-schemas
RUN yarn run build-client

FROM python:3.8-slim@sha256:8f9d73f3f3ffcabcfbe7c8a0330c8cb054bde96dd46992e97539d43153434dba

RUN apt-get update && apt-get install -y gcc libpq-dev

WORKDIR /app

COPY ./agot-bg-website/requirements.txt .
RUN pip install --upgrade pip setuptools wheel
RUN pip install -r requirements.txt
RUN pip install daphne==2.4.1

# From the previous stage, copy the assets and the index.html
COPY --from=build-client /app/dist ./static_game
COPY --from=build-client /app/dist/index.html ./agotboardgame_main/templates/agotboardgame_main/play.html

COPY ./agot-bg-website .
COPY website.Procfile Procfile

RUN mkdir /django_metrics
