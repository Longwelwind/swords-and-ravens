from typing import List
from django.db.models import Q, F

from chat.models import UserInRoom
from agotboardgame_main.models import Game, ONGOING


def enrich_games(request, games: List[Game],
                 enrich_player_in_game: bool,
                 enrich_inactive_players: bool,
                 enrich_inactive_user_id: bool,
                 enrich_important_messages: bool):
    for game in games:
        if enrich_player_in_game and game.player_in_game is not None and len(game.player_in_game) == 1:
            game.player_in_game = game.player_in_game[0]

        if enrich_inactive_players and game.state == ONGOING and not game.is_private and game.inactive_2 and len(game.inactive_players) > 0 and not game.replace_player_vote_ongoing:
            inactive_players = ""
            for inactive_player in game.inactive_players:
                house = inactive_player.data.get("house", "Unknown House").capitalize()
                if house in game.view_of_game.get("waitingFor", ""):
                    inactive_players = inactive_players + house + (" (" + inactive_player.user.username + ")" if not game.is_faceless else "") + ", "
            game.inactive_players = inactive_players[:-2] if len(inactive_players) >= 2 else None
        else:
            game.inactive_players = None

        if enrich_inactive_user_id and request.user.has_perm("agotboardgame_main.can_play_as_another_player"):
            if game.view_of_game.get("waitingForIds", None) and len(game.view_of_game.get("waitingForIds")) > 0:
                game.inactive_user_id = game.view_of_game.get("waitingForIds")[0]

        # Check whether there is an unseen message in
        if enrich_important_messages and "important_chat_rooms" in game.player_in_game.data:
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
