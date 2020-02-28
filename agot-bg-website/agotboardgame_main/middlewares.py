from django.utils import timezone

from agotboardgame_main.models import User


def update_last_activity(get_response):
    def middleware(request):
        if request.user.is_authenticated:
            request.user.last_activity = timezone.now()
            request.user.save()

        response = get_response(request)

        return response

    return middleware
