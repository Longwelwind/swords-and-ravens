from django import template

register = template.Library()


@register.inclusion_tag("agotboardgame_main/components/games_table.html")
def games_table(games, user, perms, showJoinAs = False):
    return {"games": games, "user": user, "perms": perms, "on_probation": user.is_authenticated and user.is_in_group("On probation"), "show_join_as": showJoinAs}
