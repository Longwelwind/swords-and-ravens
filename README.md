# Swords and Ravens

![beta](https://img.shields.io/badge/version-beta-blue)

"Swords and Ravens" is a reimplementation of the board game published by Fantasy Flight Games "A Game of Thrones: Board Game - Second Edition".

This repository also serves as a bug tracker. Head to [the issues section](../../issues) if you want to report a bug, see the progression on the different features, or to see what's planned for the game! Before creating an issue to report a bug or propose a feature, please make sure that an issue does not already exist by using the search functions.

Suggestions, remarks and other feedbacks can done on [the discord server](https://discord.gg/wWgCdvM) (Ask Tex for access to the feedback channel).

## General Architecture

The project is separated into 2 components:

* A website in `Python` with the `Django` framework. This component handles user registrations, creating games as well as a joining them. It exposes a REST API used by the game server. Finally, it also contains the logic for the chat used in the games. The code is located in `agot-bg-website/`.
* A game server in `Typescript` with `React`, `mobx` and `bootstrap`. It runs the games of AGoT. It is itself composed of a front-end and a back-end. The code is located in `agot-bg-game-server/`.

Additional documentation about how those components work can be found in the folder of each component.

## How to Run

There a multiple ways to run the code, depending on what components on what you want to run.

### Launching the Game Only

Requires `NodeJS` and `yarn`. Install the dependencies and initialize the environment variables by executing:

```bash
cp agot-bg-game-server/
yarn install
yarn run generate-json-schemas
cp .env.dev.local .env
```

In 2 different terminals, execute:

* `yarn run run-client`
* `yarn run run-server`

Open `http://localhost:8080/static/#1` in your browser. Additional players can be simulated by opening new browser tabs and changing the number at the end of the url.

Closing and re-reunning `run-server` will create a new game.

**Note**: The chat, which is managed by the website, will not be available.

### Launching the Website Only

Requires `docker` and `python3`.

To spin up the PostgreSQL database and a Redis database, open a terminal and execute `docker-compose up`.

Install the dependencies of the component, initialize the database and create a super user by running:

```bash
cd agot-bg-website/
cp .env.dev .env
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python3 manage.py migrate

# This command will ask for a password. Use "rootroot"
python3 manage.py createsuperuser --username Longwelwind
```

Once done, you can run the server by executing:

```bash
python3 manage.py runserver
```

The website will be accessible at `http://localhost:8000/` (as well as `http://localhost:8000/admin`). Some functionalities such as mail notifications and social authentications will require environment variables defined in `.env`.

**Note**: If you try to open a game via the website, you will land on a template page.

### Launching the Game and the Website

To launch the 2 components and make them inter-connected, make sure the dependencies are installed and the database is up and running (follow the instructions given in the precedent sections).

Replace the environment configuration of the game-server with a live one: `cp .env.live .env`.

The front-end of the game server must be built and placed in the website. This can be done by executing `./build_and_place_game_client_into_django.sh`.

You can now run the game server and the website by launching, in 2 two different terminals:

* In `agot-bg-game-server/`, execute `yarn run run-server`.
* In `agot-bg-website/`, execute `python3 manage.py runserver`.


## How to deploy

The easiest way to host the game is to use `dokku`. The easiest way is to provision an instance on DigitalOcean with dokku pre-installed. You will also need a domain name (e.g. swordsandravens.net). This domain name, as well as the subdomain name `play.<domain_name>` must point to  the provisioend `dokku` instance. On this `dokku` instance, make sure that:

* The plugins `dokku-redis` and `dokku-postgres` are instaled.

To deploy the app on this `dokku` instance:

* Clone the repository
* Create 2 remote that points to your `dokku` instance:
  * `git remote add dokku-website dokku@<domain_name>:<domain_name>`
  * `git remote add dokku-game-server dokku@<domain_name>:play`
* Create the `dokku` apps on the instance:
  * `ssh dokku@<domain_name> apps:create <domain_name>`
  * `ssh dokku@<domain_name> apps:create play`
* Create the databases and link them to the appropriate app:
  * `ssh dokku@<domain_name> postgres:create <domain_name>`
  * `ssh dokku@<domain_name> postgres:link <domain_name> <domain_name>`
  * `ssh dokku@<domain_name> redis:create <domain_name>`
  * `ssh dokku@<domain_name> redis:link <domain_name> <domain_name>`
* Configure the website:
  * `ssh dokku@<domain_name> docker-options:add <domain_name> build '--file website.Dockerfile'`
  * `ssh dokku@<domain_name> SECRET_KEY=None SENTRY_DSN=None EMAIL_HOST_USER=None EMAIL_HOST_PASSWORD=None SOCIAL_AUTH_DISCORD_KEY=None SOCIAL_AUTH_DISCORD_OAUTH2_KEY=None SOCIAL_AUTH_DISCORD_OAUTH2_SECRET=None SOCIAL_AUTH_DISCORD_SECRET=None SOCIAL_AUTH_GOOGLE_OAUTH2_KEY=None SOCIAL_AUTH_GOOGLE_OAUTH2_SECRET=None`
  * **Note:** For a staging/testing environment, setting a correct value for any of those variables is not necessary.
* Push the code of the website to deploy:
  * `git push dokku-website`
  * It should launch successfuly.
* Initialize database and create first user
  * `ssh dokku@<domain_name> run <domain_name> python manage.py migrate`
  * `ssh dokku@<domain_name> run <domain_name> python manage.py createsuperuser`
* Configure the game server. The credentials of the user you have created previously must be used (`<username>` and `<password>`):
  * `ssh dokku@<domain_name> docker-options:add play build '--file game_server.Dockerfile'`
  * `ssh dokku@play MASTER_API_BASE_URL=<domain_name> MASTER_API_ENABLED=True MASTER_API_USERNAME=<username> MASTER_API_PASSWORD=<password>`
* Push the code of the game server to deploy:
  * `git push dokku-game-server`
  * It should launch successfuly.