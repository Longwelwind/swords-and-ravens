FROM node:10.16 AS build-client
# Build the client of the game
WORKDIR /app

COPY ./agot-bg-game-server/package.json . 
RUN yarn install

COPY ./agot-bg-game-server/ .

RUN yarn run generate-json-schemas
RUN yarn run build-client

FROM python:3.6

WORKDIR /app

COPY ./agot-bg-website/requirements.txt .
RUN pip install -r requirements.txt
RUN pip install gunicorn==19.9.0

# From the previous stage, copy the assets and the index.html
COPY --from=build-client /app/dist ./static_game
COPY --from=build-client /app/dist/index.html ./agotboardgame_main/templates/agotboardgame_main/play.html

COPY ./agot-bg-website .

# In order to run the following command, environment variable must be set.
# None of them will be used, though, so we can just put placeholders
RUN SECRET_KEY=not_used \
    DATABASE_URL=not_used \
    SOCIAL_AUTH_GOOGLE_OAUTH2_KEY=not_used \
    SOCIAL_AUTH_GOOGLE_OAUTH2_SECRET=not_used \
    SOCIAL_AUTH_DISCORD_KEY=not_used \
    SOCIAL_AUTH_DISCORD_SECRET=not_used \
    EMAIL_HOST_USER=not_used \
    EMAIL_HOST_PASSWORD=not_used \
    python manage.py collectstatic

RUN mkdir /django_metrics

CMD gunicorn agotboardgame.wsgi:application -c gunicorn_config.py --bind 0.0.0.0:$PORT --workers 2