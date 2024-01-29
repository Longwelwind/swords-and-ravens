# custom_filters.py
from django import template

register = template.Library()

@register.filter(name='get_length')
def get_length(value):
    return len(value)
