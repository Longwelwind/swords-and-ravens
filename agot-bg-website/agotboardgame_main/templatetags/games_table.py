from django import template

register = template.Library()


@register.inclusion_tag("agotboardgame_main/components/games_table.html")
def games_table(games, user, perms):
    return {"games": games, "user": user, "perms": perms, "banned_or_on_probation": user.is_authenticated and user.is_in_one_group(["On probation", "Banned"])}
