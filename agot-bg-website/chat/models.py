import uuid

from django.contrib.auth import get_user_model
from django.db import models

class Room(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, unique=True)
    name = models.CharField(max_length=200)
    public = models.BooleanField()
    max_retrieve_count = models.IntegerField(null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.id})"

    class Meta:
        ordering = ("-created_at", )


class Message(models.Model):
    room = models.ForeignKey(Room, related_name='messages', on_delete=models.CASCADE)
    user = models.ForeignKey(get_user_model(), on_delete=models.CASCADE)
    text = models.CharField(max_length=200)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        created_at_formmated = self.created_at.strftime("%m/%d/%y %H:%M:%S")
        return f"{created_at_formmated}: {self.user.username}: \"{self.text}\" (Room {self.room.id}: {self.room.name})"


class UserInRoom(models.Model):
    user = models.ForeignKey(get_user_model(), on_delete=models.CASCADE)
    room = models.ForeignKey(Room, related_name='users', on_delete=models.CASCADE)
    last_viewed_message = models.ForeignKey(Message, on_delete=models.CASCADE, null=True, blank=True)
