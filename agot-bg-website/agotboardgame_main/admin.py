from django.contrib import admin

from agotboardgame_main.models import Game, PlayerInGame, User

admin.site.register(User)
admin.site.register(Game)
admin.site.register(PlayerInGame)
