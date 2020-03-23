from django import template

register = template.Library()


@register.inclusion_tag("agotboardgame_main/components/tasks_list.html")
def tasks_list(tasks):
    return {"tasks": tasks}
