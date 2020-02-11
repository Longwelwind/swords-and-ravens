from django.contrib.auth import logout
from django.contrib.auth.decorators import login_required
from django.db.models import Q
from django.http import HttpResponseRedirect, HttpResponse, HttpResponseNotFound
from django.shortcuts import render, get_object_or_404
from django.template.loader import select_template

from agotboardgame_main.models import Game, ONGOING, IN_LOBBY, User
from chat.models import Room


def index(request):
    return render(request, "agotboardgame_main/index.html")


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
            player_in_game = game.players.filter(user=request.user).first()
            game.player_in_game = player_in_game

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
    if user_id:
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


def user_profile(request, user_id):
    user = get_object_or_404(User, id=user_id)

    return render(request, "agotboardgame_main/user_profile.html", {"viewed_user": user})


def logout_view(request):
    logout(request)
    return HttpResponseRedirect('/')
