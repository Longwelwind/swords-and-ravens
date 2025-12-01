import logging

from django.core.mail import send_mass_mail
from django.template.loader import render_to_string
from django.urls import reverse
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view, permission_classes
from rest_framework.mixins import RetrieveModelMixin, UpdateModelMixin, CreateModelMixin
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet

from agotboardgame.settings import DEFAULT_FROM_MAIL
from agotboardgame_main.models import PbemResponseTime, User, Game, CANCELLED
from chat.models import Message
from api.serializers import UserSerializer, GameSerializer, RoomSerializer, GameViewSerializer
from chat.models import Room

LOGGER = logging.getLogger(__name__)


class UserViewSet(RetrieveModelMixin, GenericViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer


class GameViewSet(RetrieveModelMixin, UpdateModelMixin, GenericViewSet):
    queryset = Game.objects.all()
    serializer_class = GameSerializer


class RoomViewSet(CreateModelMixin, GenericViewSet):
    queryset = Room.objects.all()
    serializer_class = RoomSerializer


@api_view(['POST'])
@permission_classes([IsAdminUser])
@csrf_exempt
def notify_ready_to_start(request, game_id):
    user_ids = request.data['users']
    game = Game.objects.get(id=game_id)
    users = [User.objects.get(id=user_id) for user_id in user_ids]

    # Filter users who turned off email
    users = [user for user in users if user.email_notification_active]

    mails = [
        (
            f'Your game is ready to start: {game.name}',
            render_to_string(
                'agotboardgame_main/ready_to_start_notification.html',
                {'game': game, 'user': user, 'game_url': request.build_absolute_uri(reverse('play', args=[game.id]))}
            ),
            DEFAULT_FROM_MAIL, [user.email]
        )
        for user in users
    ]

    send_mass_mail(mails)

    return Response({'status': 'ok'})


@api_view(['POST'])
@permission_classes([IsAdminUser])
@csrf_exempt
def notify_your_turn(request, game_id):
    user_ids = request.data['users']
    game = Game.objects.get(id=game_id)
    users = [User.objects.get(id=user_id) for user_id in user_ids]

    # Filter users who turned off email
    users = [user for user in users if user.email_notification_active]

    mails = [
        (
            f'It\'s your turn in \'{game.name}\'',
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


@api_view(['POST'])
@permission_classes([IsAdminUser])
@csrf_exempt
def notify_bribe_for_support(request, game_id):
    user_ids = request.data['users']
    game = Game.objects.get(id=game_id)
    users = [User.objects.get(id=user_id) for user_id in user_ids]

    # Filter users who turned off email
    users = [user for user in users if user.email_notification_active]

    mails = [
        (
            f'You are attacked and now can call for support in \'{game.name}\'',
            render_to_string(
                'agotboardgame_main/bribe_for_support_notification.html',
                {'game': game, 'user': user, 'game_url': request.build_absolute_uri(reverse('play', args=[game.id]))}
            ),
            DEFAULT_FROM_MAIL, [user.email]
        )
        for user in users
    ]

    send_mass_mail(mails)

    return Response({'status': 'ok'})


@api_view(['POST'])
@permission_classes([IsAdminUser])
@csrf_exempt
def notify_battle_results(request, game_id):
    user_ids = request.data['users']
    game = Game.objects.get(id=game_id)
    users = [User.objects.get(id=user_id) for user_id in user_ids]

    # Filter users who turned off email
    users = [user for user in users if user.email_notification_active]

    mails = [
        (
            f'Your battle is over in \'{game.name}\'',
            render_to_string(
                'agotboardgame_main/battle_results_notification.html',
                {'game': game, 'user': user, 'game_url': request.build_absolute_uri(reverse('play', args=[game.id]))}
            ),
            DEFAULT_FROM_MAIL, [user.email]
        )
        for user in users
    ]

    send_mass_mail(mails)

    return Response({'status': 'ok'})


@api_view(['POST'])
@permission_classes([IsAdminUser])
@csrf_exempt
def notify_new_vote(request, game_id):
    user_ids = request.data['users']
    game = Game.objects.get(id=game_id)
    users = [User.objects.get(id=user_id) for user_id in user_ids]

    # Filter users who turned off email
    users = [user for user in users if user.email_notification_active]

    mails = [
        (
            f'Your vote is needed in \'{game.name}\'',
            render_to_string(
                'agotboardgame_main/vote_notification.html',
                {'game': game, 'user': user, 'game_url': request.build_absolute_uri(reverse('play', args=[game.id]))}
            ),
            DEFAULT_FROM_MAIL, [user.email]
        )
        for user in users
    ]

    send_mass_mail(mails)

    return Response({'status': 'ok'})


@api_view(['POST'])
@permission_classes([IsAdminUser])
@csrf_exempt
def notify_game_ended(request, game_id):
    user_ids = request.data['users']
    game = Game.objects.get(id=game_id)
    users = [User.objects.get(id=user_id) for user_id in user_ids]

    # Filter users who turned off email
    users = [user for user in users if user.email_notification_active]

    mails = [
        (
            f'Game has ended -  {game.name}',
            render_to_string(
                'agotboardgame_main/game_ended_notification.html',
                {'game': game, 'user': user, 'game_url': request.build_absolute_uri(reverse('play', args=[game.id]))}
            ),
            DEFAULT_FROM_MAIL, [user.email]
        )
        for user in users
    ]

    send_mass_mail(mails)

    return Response({'status': 'ok'})


@api_view(['POST'])
@permission_classes([IsAdminUser])
@csrf_exempt
def add_pbem_response_time(request, user_id, response_time):
    user = User.objects.get(id=user_id)

    #print(f'Received response time {response_time} for user {user.username}')
    new_entry = PbemResponseTime(user=user, response_time=response_time)
    new_entry.save()

    return Response({'status': 'ok'})


@api_view(['DELETE'])
@permission_classes([IsAdminUser])
@csrf_exempt
def clear_chat_room(request, room_id):
    Message.objects.filter(room_id=room_id).delete()
    return Response({'status': 'ok'})


@api_view(['GET'])
@permission_classes([IsAdminUser])
@csrf_exempt
def is_game_cancelled(request, game_id):
    try:
        game = Game.objects.get(id=game_id)
        return Response({'cancelled': game.state == CANCELLED }, status=200)
    except Game.DoesNotExist:
        return Response({'error': 'Game not found'}, status=404)


@api_view(['GET'])
@permission_classes([])
def get_game_view(request, game_id):
    """Public API endpoint for anonymous access to view_of_game"""
    try:
        game = Game.objects.get(id=game_id)
        serializer = GameViewSerializer(game)
        return Response(serializer.data, status=200)
    except Game.DoesNotExist:
        return Response({'error': 'Game not found'}, status=404)