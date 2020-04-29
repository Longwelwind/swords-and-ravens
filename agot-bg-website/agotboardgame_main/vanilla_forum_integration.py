import logging
import uuid

import requests
from django.conf import settings

LOGGER = logging.getLogger(__name__)


def create_session():
    session = requests.Session()
    session.headers.update({'Authorization': f'Bearer {settings.VANILLA_FORUM_API_KEY}'})

    return session


def create_vanilla_forum_user_for_django_user(django_user):
    response = create_vanilla_forum_user(email=django_user.email, name=django_user.username, password=str(uuid.uuid4()))

    if response is None:
        return

    django_user.vanilla_forum_user_id = response["userID"]
    django_user.save()


def create_vanilla_forum_user(email, name, password, email_confirmed=True, bypass_spam=False):
    request = create_session().post(f"{settings.VANILLA_FORUM_HOST}/api/v2/users", json={
        "email": email,
        "name": name,
        "password": password,
        "emailConfirmed": email_confirmed,
        "bypassSpam": bypass_spam
    })

    if request.status_code != 201:
        LOGGER.error(f'An error occured while trying to create a Vanilla forum user "{name}" {request}')
        return None

    response = request.json()

    return response
