FROM node:14

WORKDIR /app

COPY ./agot-bg-game-server/package.json .
COPY ./agot-bg-game-server/yarn.lock .
RUN yarn install --frozen-lockfile

COPY ./agot-bg-game-server/ .

RUN yarn run generate-json-schemas

CMD yarn run run-server
