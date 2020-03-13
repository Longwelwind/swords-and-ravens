from datetime import datetime, date

from django.contrib import messages
from django.contrib.auth import logout
from django.contrib.auth.decorators import login_required
from django.db.models import Q
from django.http import HttpResponseRedirect, HttpResponse, HttpResponseNotFound
from django.shortcuts import render, get_object_or_404
from django.template.loader import select_template
from django.views.decorators.http import require_POST

from agotboardgame_main.models import Game, ONGOING, IN_LOBBY, User
from chat.models import Room
from agotboardgame_main.forms import UpdateUsernameForm


def index(request):
    posts = [
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

    return render(request, "agotboardgame_main/index.html", {"posts": posts})


def login(request):
    return render(request, "agotboardgame_main/login.html")


def register(request):
    return render(request, "agotboardgame_main/register.html")


def games(request):
    if request.method == "GET":
        games = Game.objects.filter(Q(state=IN_LOBBY) | Q(state=ONGOING))
        # It seems to be hard to ask Postgres to order the list correctly.
        # It is done in Python
        games = sorted(games, key=lambda row: [IN_LOBBY, ONGOING].index(row.state))

        for game in games:
            if request.user.is_authenticated:
                player_in_game = game.players.filter(user=request.user).first()
                game.player_in_game = player_in_game
            else:
                game.player_in_game = None

        public_room_id = Room.objects.get(name='public').id

        return render(request, "agotboardgame_main/games.html", {
            "games": games,
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

    return render(request, "agotboardgame_main/settings.html", {"update_username_form": update_username_form})


def user_profile(request, user_id):
    user = get_object_or_404(User, id=user_id)

    return render(request, "agotboardgame_main/user_profile.html", {"viewed_user": user})


def logout_view(request):
    logout(request)
    return HttpResponseRedirect('/')
