from django.contrib import admin

from agotboardgame_main.models import Game, PlayerInGame, User, PbemResponseTime


@admin.register(Game)
class GameAdmin(admin.ModelAdmin):
    search_fields = ("name__startswith", "id__startswith")

@admin.register(PlayerInGame)
class PlayerInGameAdmin(admin.ModelAdmin):
    search_fields = ("user__username__startswith", )

@admin.register(PbemResponseTime)
class PbemResponseTimeAdmin(admin.ModelAdmin):
    search_fields = ("user__username__startswith", )

@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    search_fields = ("username__startswith", "id__startswith")