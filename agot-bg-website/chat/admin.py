from django.contrib import admin

from chat.models import UserInRoom, Message, Room

@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
    search_fields = ("name__icontains", "id__startswith")

@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    search_fields = ("user__username__startswith", "room__id__startswith", "room__name__icontains")
