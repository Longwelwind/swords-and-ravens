from django.contrib import admin

from chat.models import UserInRoom, Message, Room

@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
    pass

@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    search_fields = ("user__username__startswith", "room__id__startswith")

""" @admin.register(UserInRoom)
class UserInRoomAdmin(admin.ModelAdmin):
    pass """
