from django import template

register = template.Library()


@register.inclusion_tag("agotboardgame_main/components/house_icon.html")
def house_icon(house_id):
    return {"house": house_id.capitalize(), "img_src": "house_icons/" + house_id + ".png"}
