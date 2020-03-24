from django import template

register = template.Library()


@register.inclusion_tag("agotboardgame_main/components/games_table.html")
def games_table(games, user, perms):
    return {"games": games, "user": user, "perms": perms}
