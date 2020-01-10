import logging

from django.core.mail import send_mass_mail
from django.template.loader import render_to_string
from django.urls import reverse
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view
from rest_framework.response import Response

from agotboardgame.settings import DEFAULT_FROM_MAIL
from agotboardgame_main.models import User, Game

LOGGER = logging.getLogger(__name__)


@api_view(['POST'])
@csrf_exempt
def notify(request, game_id):
    user_ids = request.data['users']
    game = Game.objects.get(id=game_id)
    users = [User.objects.get(id=user_id) for user_id in user_ids]

    mails = [
        (
            f'{game.name} -  It\'s your turn!',
            render_to_string(
                'agotboardgame_main/mail_notification.html',
                {'game': game, 'user': user, 'game_url': request.build_absolute_uri(reverse('play', args=[game.id]))}
            ),
            DEFAULT_FROM_MAIL, [user.email]
        )
        for user in users
    ]

    send_mass_mail(mails)

    return Response({'status': 'ok'})
