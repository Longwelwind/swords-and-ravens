FROM node:14 AS build-client
# Build the client of the game
WORKDIR /app

COPY ./agot-bg-game-server/package.json . 
COPY ./agot-bg-game-server/yarn.lock . 
RUN yarn install --frozen-lockfile

COPY ./agot-bg-game-server/ .

RUN yarn run generate-json-schemas
RUN yarn run build-client

FROM python:3.6-slim

WORKDIR /app

COPY ./agot-bg-website/requirements.txt .
RUN pip install -r requirements.txt
RUN pip install daphne==2.4.1

# From the previous stage, copy the assets and the index.html
COPY --from=build-client /app/dist ./static_game
COPY --from=build-client /app/dist/index.html ./agotboardgame_main/templates/agotboardgame_main/play.html

COPY ./agot-bg-website .
COPY website.Procfile Procfile

# In order to run the following command, environment variable must be set.
# None of them will be used, though, so we can just put placeholders
RUN SECRET_KEY=not_used \
    DATABASE_URL=not_used \
    SOCIAL_AUTH_GOOGLE_OAUTH2_KEY=not_used \
    SOCIAL_AUTH_GOOGLE_OAUTH2_SECRET=not_used \
    SOCIAL_AUTH_DISCORD_KEY=not_used \
    SOCIAL_AUTH_DISCORD_SECRET=not_used \
    EMAIL_HOST=not_used \
    EMAIL_PORT=not_used \
    EMAIL_HOST_USER=not_used \
    EMAIL_HOST_PASSWORD=not_used \
    REDIS_URL=not_used \
    python manage.py collectstatic -l

RUN mkdir /django_metrics
