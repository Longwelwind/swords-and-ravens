import logging
from datetime import datetime, date, timedelta

from django import template
from django.contrib import messages
from django.contrib.auth import logout
from django.contrib.auth.decorators import login_required
from django.db.models import Q, Count, Prefetch, F
from django.http import HttpResponseRedirect, HttpResponse, HttpResponseNotFound
from django.shortcuts import render, get_object_or_404
from django.template.loader import select_template
from django.views.decorators.http import require_POST

from agotboardgame.settings import GROUP_COLORS
from agotboardgame_main.models import Game, ONGOING, IN_LOBBY, User, CANCELLED, PlayerInGame
from chat.models import Room, UserInRoom
from agotboardgame_main.forms import UpdateUsernameForm, UpdateSettingsForm

logger = logging.getLogger(__name__)


def index(request):
    posts = [
        {
            "title": "Swords and Ravens after 2 months: some numbers and what's to come!",
            "content": """
            <p>
                <b>Swords and Ravens</b> launched 2 months ago, and a lot of things have happened since then.
                1416 users registered and more than 500 games have been played to completion!
            </p>

            <p>
                The game also evolved a lot since launch: variants for games with less than 6 players have
                appeared, a forum has been added to discuss everything about the game, a lot of UI improvements
                were made and a ton of bugs have been squashed. Around 800 commits were made on the codebase,
                available on <a href="https://github.com/Longwelwind/swords-and-ravens">GitHub</a>, some of
                them done by <a href="https://github.com/Longwelwind/swords-and-ravens/graphs/contributors">external
                contributors</a>. All the changes done can be found
                in <a href="https://community.swordsandravens.net/viewtopic.php?f=4&t=7">the changelog</a>.
            </p>

            <p>
                The <a href="https://community.swordsandravens.net">forum</a> has been launched, to discuss
                everything related to the game and the development of Swords and Ravens, don't hesitate to check
                it out!
            </p>

            <p>
                It's not over, obviously. The Vassals mechanic, which appeared in the MoD extension, is
                progressing and will be playable in the coming months. Multiple other meta-game features such
                as abuse reports, player statistics and localization are also planned, and should be available
                once I find the time to work on them. 😛
            </p>

            <p>
                Thanks to all the players who made this possible, and I hope S&R will allow many more games to
                be played!
            </p>
        """,
            "created_at": date(day=20, month=5, year=2020)
        },
        {
            "title": "Welcome to Swords and Ravens!",
            "content": """
                <p>
                    <strong>Swords and Ravens</strong> is a platform to play the board game "A Game of Thrones:
                    Board Game - Second Edition", edited by Fantasy Flight Games, online with players around the world!
                </p>
                <p>
                    At the moment, this website only features the base game. Extensions (with
                    <strong>Mother of Dragons</strong>) are currently planned to be implemented.
                </p>
                <p>
                    Feedbacks, bug reports and other remarks can also be posted on
                    the <a href="https://discord.gg/wWgCdvM">Discord</a>!
                    The source code can be found
                    on <a href="https://github.com/Longwelwind/swords-and-ravens">the Github of the project</a>.
                </p>
            """,
            "created_at": date(day=14, month=3, year=2020)
        }
    ]

    # Retrieves some stats to show on the front page
    active_games_count = Game.objects.filter(updated_at__gt=datetime.now() - timedelta(days=2)).count()

    return render(
        request,
        "agotboardgame_main/index.html",
        {"posts": posts, "active_games_count": active_games_count}
    )


def login(request):
    return render(request, "agotboardgame_main/login.html")


def register(request):
    return render(request, "agotboardgame_main/register.html")


def about(request):
    game_tasks = [
        {"name": "Base Game Second Edition", "done": True, "children": [
            {"name": "Tides of Battle"}
        ]},
        {"name": "A Feast for Crows"},
        {"name": "A Dance with Dragons"},
        {"name": "Mother of Dragons", "children": [
            {"name": "Vassals", "next": True},
            {"name": "House Arryn"},
            {"name": "Iron Bank"},
            {"name": "Essos and House Targaryen"}
        ]}
    ]

    meta_tasks = [
        {"name": "Ranked games"},
        {"name": "Game Statistics (win rates, ...)"},
        {"name": "Player Statistic (kicked rate, ...)"},
        {"name": "Player Reports & moderation tools"},
        {"name": "Replays"}
    ]

    return render(request, "agotboardgame_main/about.html", {"game_tasks": game_tasks, "meta_tasks": meta_tasks})


def games(request):
    if request.method == "GET":
        # Fetch the list of open or ongoing games.
        # Pre-fetch the PlayerInGame entry related to the authenticated player
        # This means that "game.players" will only contain one entry, the one related to the authenticated player.
        games_query = Game.objects.annotate(players_count=Count('players')).prefetch_related('owner')

        if request.user.is_authenticated:
            games_query = games_query.prefetch_related(Prefetch('players', queryset=PlayerInGame.objects.filter(user=request.user), to_attr="player_in_game"))

        games = games_query.filter(Q(state=IN_LOBBY) | Q(state=ONGOING))

        # It seems to be hard to ask Postgres to order the list correctly.
        # It is done in Python
        games = sorted(games, key=lambda game: ([IN_LOBBY, ONGOING].index(game.state), -datetime.timestamp(game.updated_at)))

        for game in games:
            # "game.player_in_game" contains a list of one or zero element, depending on whether the authenticated
            # player is in the game.
            # Transform that into a single field that can be None.
            if request.user.is_authenticated:
                game.player_in_game = game.player_in_game[0] if len(game.player_in_game) > 0 else None
            else:
                game.player_in_game = None

            # Check whether there is an unseen message in
            if game.player_in_game and "important_chat_rooms" in game.player_in_game.data:
                # `important_chat_rooms` will contain a list of room ids that must trigger a warning
                # if there are unseen messages.
                important_chat_rooms = game.player_in_game.data["important_chat_rooms"]

                # This is a query inside a loop, not super good for performance,
                # but since this only applies to games of the player, it should not impact performance that much.
                unseen_private_messages = UserInRoom.objects.filter(
                    Q(room__messages__created_at__gt=F("last_viewed_message__created_at"))
                    | Q(last_viewed_message__isnull=True),
                    user=game.player_in_game.user,
                    room__in=important_chat_rooms,
                    room__messages__isnull=False
                ).exists()

                game.unseen_private_messages = unseen_private_messages
            else:
                game.unseen_private_messages = False

        # Create the list of "My games"
        my_games = [game for game in games if game.player_in_game]

        public_room_id = Room.objects.get(name='public').id

        return render(request, "agotboardgame_main/games.html", {
            "games": games,
            "my_games": my_games,
            'public_room_id': public_room_id
        })
    elif request.method == "POST":
        if not request.user.has_perm("agotboardgame_main.add_game"):
            return HttpResponseRedirect("/")

        name = request.POST.get("name", "")

        game = Game()
        game.name = name
        game.owner = request.user
        game.save()

        if len(name) < 4 or 24 < len(name):
            return HttpResponseRedirect("/games")

        return HttpResponseRedirect(f"/play/{game.id}")


def cancel_game(request, game_id):
    if not request.user.has_perm("agotboardgame_main.cancel_game"):
        return HttpResponseRedirect("/")

    game = get_object_or_404(Game, id=game_id)

    game.state = CANCELLED
    game.save()

    logger.info(f"{request.user.username} ({request.user.id}) cancelled game {game.name} ({game.id})")

    return HttpResponseRedirect("/games")


@login_required
def play(request, game_id, user_id=None):
    # Specifying a user_id allows users to impersonate other players in a game
    if user_id and request.user.has_perm("agotboardgame_main.can_play_as_another_player"):
        user = get_object_or_404(User, id=user_id)
    else:
        user = request.user

    game = get_object_or_404(Game, id=game_id)

    if not game:
        return HttpResponseNotFound()

    auth_data = {
        "gameId": game_id,
        "userId": user.id,
        "authToken": user.game_token
    }

    # In development, serve a fake "play" template.
    # The Dockerfile will place the real "play.html" inside the template folder. This
    # play.html will be the generated "index.html" by Webpack of "agot-bg-game".
    template = select_template(["agotboardgame_main/play.html", "agotboardgame_main/play_fake.html"])

    return HttpResponse(template.render({"auth_data": auth_data}, request))


@login_required
def settings(request):
    # Initialize all forms used in the settings page
    update_username_form = UpdateUsernameForm(instance=request.user)
    update_settings_form = UpdateSettingsForm(instance=request.user)

    # Possibly treat a form if a POST request was sent
    if request.method == "POST":
        form_type = request.POST.get('form_type')

        if form_type == 'update_username':
            # request.user can't be used because is_valid will modify the instance in-place,
            # leading to inconsistent values being shown in the UI when "render" is called.
            current_user = User.objects.get(pk=request.user.id)

            # Check if user can update their username
            if not current_user.can_update_username:
                return HttpResponseRedirect('/settings/')

            update_username_form = UpdateUsernameForm(request.POST, instance=current_user)

            if update_username_form.is_valid():
                update_username_form.save(commit=False)
                current_user.last_username_update_time = datetime.now()
                current_user.save()

                messages.success(request, "Username successfuly changed!")

                return HttpResponseRedirect('/settings/')
        elif form_type == 'update_settings':
            update_settings_form = UpdateSettingsForm(request.POST, instance=request.user)

            if update_settings_form.is_valid():
                update_settings_form.save()

                messages.success(request, "Settings changed!")

                return HttpResponseRedirect('/settings/')

    return render(request, "agotboardgame_main/settings.html", {"update_username_form": update_username_form, "update_settings_form": update_settings_form})


def user_profile(request, user_id):
    user = get_object_or_404(User, id=user_id)

    group_name = None
    group_color = None
    for possible_group_name, possible_group_color in GROUP_COLORS.items():
        if user.is_in_group(possible_group_name):
            group_name = possible_group_name
            group_color = possible_group_color
            break

    return render(request, "agotboardgame_main/user_profile.html", {"viewed_user": user, "group_name": group_name, "group_color": group_color})


def logout_view(request):
    logout(request)
    return HttpResponseRedirect('/')
