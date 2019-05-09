FROM node:10.16

WORKDIR /app

COPY ./agot-bg-game-server/package.json .
RUN yarn install

COPY ./agot-bg-game-server/ .

RUN yarn run generate-json-schemas

CMD yarn run run-server
