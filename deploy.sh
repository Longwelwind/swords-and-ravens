#!/bin/bash

git add . && git commit --amend --no-edit && git push -f && git push -f dokku-website && git push -f dokku-game-server

