from django.contrib import admin

from chat.models import UserInRoom, Message, Room

admin.site.register(Room)
admin.site.register(Message)
admin.site.register(UserInRoom)
