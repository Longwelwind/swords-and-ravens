from cmath import pi
import logging
from datetime import datetime, date, timedelta

from django.db.models.functions import Cast
from django.contrib.postgres.fields.jsonb import KeyTextTransform

from django import template
from django.contrib import messages
from django.contrib.auth import logout
from django.contrib.auth.decorators import login_required
from django.db.models import Q, Count, Prefetch, F, BooleanField, ExpressionWrapper
from django.http import HttpResponseRedirect, HttpResponse, HttpResponseNotFound
from django.shortcuts import render, get_object_or_404
from django.template.loader import select_template
from django.views.decorators.http import require_POST
from django.utils import timezone

from agotboardgame.settings import GROUP_COLORS
from agotboardgame_main.models import Game, ONGOING, IN_LOBBY, PbemResponseTime, User, CANCELLED, FINISHED, PlayerInGame
from chat.models import Room, UserInRoom
from agotboardgame_main.forms import UpdateUsernameForm, UpdateSettingsForm

logger = logging.getLogger(__name__)


def index(request):
    posts = [
        {
            "title": "An update on Swords and Ravens",
            "content": """
            <p>
                These past few months have seen the introduction of 2 major features to <b>Swords
                and Ravens</b>: the Dance of Dragons expansion (courtesy of mmasztalerczuk and Gereon), and
                the Vassal feature from Mother of Dragons (courtesy of Gereon). You can now
                create a game and toggle these features to test them out! Remember though that they are still
                in Beta, and that bugs might still happen.
            </p>
            <p>
                This month also marks the 1-year anniversary of S&R! More than 1400 games have been played up until now,
                and the platform draws around active 300 players every day. 🎉<br/>
            </p>
            <p>
                If you've monitored the activity of the GitHub repository, you might have noticed that
                I, Longwelwind, have not actively contributed to the project for a few months now. Indeed, while I greatly
                enjoyed coding S&R at first, my time and my motivation for the project diminished over time, and I'm
                now at a point where I'd like to move on to other projects. I've handed the keys to the kingdoms
                (i.e. admin rights to the production server) to Gereon, who has been
                contributing to the project since its beginning and to whom we can thank for
                all the recent additions to the platform.
            </p>
            <p>
                As for me, I'm not done with online board games! I've learned a lot while developping S&R,
                and I'm currently experimenting on <b>Ravens</b>, a library that would allow
                anyone with coding skills to develop their own online-multiplayer board game. While it's still
                in the prototype phase at the moment, I hope I'll have a working beta for those who are interested.
            </p>
        """,
            "created_at": date(day=22, month=3, year=2021)
        },
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
    active_games_count = Game.objects.filter(Q(state=ONGOING) & Q(last_active_at__gt=datetime.now() - timedelta(days=5))).count()

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
            {"name": "Tides of Battle", "done": True}
        ]},
        {"name": "A Feast for Crows", "done": True},
        {"name": "A Dance with Dragons", "done": True},
        {"name": "Mother of Dragons", "done": True, "children": [
            {"name": "Vassals", "done": True},
            {"name": "House Arryn", "done": True},
            {"name": "Essos and House Targaryen", "done": True},
            {"name": "Iron Bank", "done": True}
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
        five_days_past = timezone.now() - timedelta(days=5)
        two_days_past = timezone.now() - timedelta(days=2)
        three_weeks_past = timezone.now() - timedelta(days=21)
        games_query = Game.objects.annotate(players_count=Count('players'),\
            replace_player_vote_ongoing=Cast(KeyTextTransform('replacePlayerVoteOngoing', 'view_of_game'), BooleanField()),\
            is_faceless=Cast(KeyTextTransform('faceless', KeyTextTransform('settings', 'view_of_game')), BooleanField()),\
            is_private=Cast(KeyTextTransform('private', KeyTextTransform('settings', 'view_of_game')), BooleanField()),\
            inactive_5=ExpressionWrapper(Q(last_active_at__lt=five_days_past), output_field=BooleanField()),\
            inactive_2=ExpressionWrapper(Q(last_active_at__lt=two_days_past), output_field=BooleanField()),\
            inactive_21=ExpressionWrapper(Q(last_active_at__lt=three_weeks_past), output_field=BooleanField())\
            ).prefetch_related('owner')

        if request.user.is_authenticated:
            games_query = games_query.prefetch_related(Prefetch('players', queryset=PlayerInGame.objects.filter(user=request.user), to_attr="player_in_game"))

        eight_days_past = timezone.now() - timedelta(days=8)
        if request.user.is_authenticated:
            games = games_query.filter(Q(state=IN_LOBBY) | Q(state=ONGOING)).prefetch_related(\
                Prefetch('players', queryset=PlayerInGame.objects.filter(user__last_activity__lt=eight_days_past), to_attr="inactive_players"))
        else:
            games = games_query.filter(Q(state=IN_LOBBY) | Q(state=ONGOING))
        # It seems to be hard to ask Postgres to order the list correctly.
        # It is done in Python
        games = sorted(games, key=lambda game: ([IN_LOBBY, ONGOING].index(game.state), -datetime.timestamp(game.last_active_at)))

        my_games = []
        active_games = []
        inactive_games = []
        replacement_needed_games = []
        inactive_private_games = []
        open_live_games = []

        for game in games:
            # "game.player_in_game" contains a list of one or zero element, depending on whether the authenticated
            # player is in the game.
            # Transform that into a single field that can be None.
            if request.user.is_authenticated:
                game.player_in_game = game.player_in_game[0] if len(game.player_in_game) > 0 else None

                if game.state == ONGOING and not game.is_private and game.inactive_2 and len(game.inactive_players) > 0 and not game.replace_player_vote_ongoing:
                    inactive_players = ""
                    for inactive_player in game.inactive_players:
                        house = inactive_player.data.get("house", "Unknown House").capitalize()
                        if house in game.view_of_game.get("waitingFor", ""):
                            inactive_players = inactive_players + house + (" (" + inactive_player.user.username + ")" if not game.is_faceless else "") + ", "
                    game.inactive_players = inactive_players[:-2] if len(inactive_players) >= 2 else None
                else:
                    game.inactive_players = None
            else:
                game.player_in_game = None
                game.inactive_players = None

            # Check whether there is an unseen message in
            if game.player_in_game and "important_chat_rooms" in game.player_in_game.data:
                # `important_chat_rooms` will contain a list of room ids that must trigger a warning
                # if there are unseen messages.
                important_chat_rooms = game.player_in_game.data["important_chat_rooms"]

                # This is a query inside a loop, not super good for performance,
                # but since this only applies to games of the player, it should not impact performance that much.
                unread_messages = UserInRoom.objects.filter(
                    Q(room__messages__created_at__gt=F("last_viewed_message__created_at"))
                    | Q(last_viewed_message__isnull=True),
                    user=game.player_in_game.user,
                    room__in=important_chat_rooms,
                    room__messages__isnull=False
                ).exists()

                game.unread_messages = unread_messages
            else:
                game.unread_messages = False

            if game.inactive_players is not None:
                replacement_needed_games.append(game)

            if game.is_private and game.inactive_21:
                inactive_private_games.append(game)

            if (game.is_private and game not in inactive_private_games) or not game.inactive_5 or game.state == IN_LOBBY:
                active_games.append(game)
            elif game not in replacement_needed_games and not game.is_private:
                inactive_games.append(game)

            if game.player_in_game:
                my_games.append(game)

            if game.state == IN_LOBBY and game.players_count > 0 and game.view_of_game.get("settings", False) and game.view_of_game.get("settings").get("pbem", True) == False:
                open_live_games.append(game)

        public_room_id = Room.objects.get(name='public').id

        return render(request, "agotboardgame_main/games.html", {
            "active_games": active_games,
            "inactive_games": inactive_games,
            "my_games": my_games,
            "open_live_games": open_live_games,
            "replacement_needed_games": replacement_needed_games,
            "inactive_private_games": inactive_private_games,
            "public_room_id": public_room_id
        })
    elif request.method == "POST":
        if not request.user.has_perm("agotboardgame_main.add_game"):
            return HttpResponseRedirect("/")

        name = request.POST.get("name", "")

        game = Game()
        game.name = name
        game.owner = request.user
        game.save()

        if len(name) > 200:
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
    game = get_object_or_404(Game, id=game_id)

    if not game:
        return HttpResponseNotFound()

    if request.user.is_in_one_group(["On probation", "Banned"]) and game.players.filter(user=request.user).count() == 0:
        # Members on probation or banned only can join their current running games
        return HttpResponseRedirect("/games")

    # Specifying a user_id allows users to impersonate other players in a game
    if user_id and request.user.has_perm("agotboardgame_main.can_play_as_another_player"):
        if game.players.filter(user=request.user).count() > 0:
            # A user cannot impersonate other players of games where he participates
            user = request.user
        else:
            user = get_object_or_404(User, id=user_id)
    else:
        user = request.user

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

    games_of_user = PlayerInGame.objects.prefetch_related('game').annotate(players_count=Count('game__players'),\
            has_won=Cast(KeyTextTransform('is_winner', 'data'), BooleanField()),\
            is_faceless=Cast(KeyTextTransform('faceless', KeyTextTransform('settings', 'game__view_of_game')), BooleanField())\
        # We can simply filter for is_faceless=False|None and omit the check for ongoing games only as we reset the property after game ended.
        ).filter(Q(user=user) & (Q(is_faceless=None) | Q(is_faceless=False))).order_by('-game__created_at')
    user.games_of_user = games_of_user.filter(Q(game__state=IN_LOBBY) | Q(game__state=ONGOING) | Q(game__state=FINISHED))
    user.cancelled_games = games_of_user.filter(game__state=CANCELLED)
    user.ongoing_count = games_of_user.filter(game__state=ONGOING).count()
    user.won_count = games_of_user.filter(Q(has_won=True) & Q(players_count__gt=2)).count()
    user.finished_count = games_of_user.exclude(data__is_winner__isnull=True).filter((Q(game__state=FINISHED) & Q(players_count__gt=2))).count()

    if user.finished_count > 0:
        user.win_rate = "{:.1f} %".format(user.won_count / user.finished_count * 100)
    else:
        user.win_rate = "n/a"

    # This will give the total average of the last 100 moves. But we want to exclude the 10 biggest and smallest values from list so we need to do it in Python
    #avg_pbem_speed = PbemResponseTime.objects.filter(user=user).order_by('-created_at')[:100].aggregate(Avg('response_time')).get('response_time__avg')
    #user.average_pbem_speed = str(timedelta(seconds=round(avg_pbem_speed))) if avg_pbem_speed is not None else "n/a"

    elements = PbemResponseTime.objects.filter(user=user).order_by('-created_at')[:100]
    if elements is not None and len(elements) > 0:
        values = [element.response_time for element in elements]
        if len(values) > 20:
            values = sorted(values)
            del values[:10]
            del values[-10:]
        avg = round(sum(values) / len(values))
        user.average_pbem_speed = str(timedelta(seconds=avg))
    else:
        user.average_pbem_speed = "n/a"
    return render(request, "agotboardgame_main/user_profile.html", {
        "viewed_user": user,
        "group_name": group_name,
        "group_color": group_color,
        "banned_or_on_probation": request.user.is_authenticated and request.user.is_in_one_group(["On probation", "Banned"])
    })


def logout_view(request):
    logout(request)
    return HttpResponseRedirect('/')
