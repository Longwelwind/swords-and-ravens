#!/bin/bash

# In production, the static files of the game client are served by Django.
# It has been done this way for multiple reasons:
# * I only have to pay for one dyno on Heroku to serve the website and the
#   static files of the client, and don't have to manage a S3 or something else.
# * The website can inject an authentication token into the game client
#   so that when it connects to the game server, it can authenticate itself.
#
# This script builds the game client and place it into the Django project.
# This script is not used to build the production artifact, and is only mean't
# to be used for development environment, to check if the integration between the
# same server and the website functions properly. "website.Dockerfile" takes
# care of doing this but for production.

echo "---> Building the game client"
cd agot-bg-game-server
yarn install
yarn run build-client

echo "---> Placing the static files of the game client into Django's static file folder"
cd ../
cp -r agot-bg-game-server/dist/. agot-bg-website/static_game/
cp agot-bg-game-server/dist/index.html agot-bg-website/agotboardgame_main/templates/agotboardgame_main/play.html