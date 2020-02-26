from django.conf.urls import url
from django.urls import path, include

from agotboardgame_main import views

urlpatterns = [
    path('', views.index),
    path('login/', views.login),
    path('logout/', views.logout_view),
    path('register/', views.register),
    path('games/', views.games),
    path('settings/', views.settings),
    path('user/<uuid:user_id>', views.user_profile),
    path('play/<uuid:game_id>', views.play, name='play'),
    path('play/<uuid:game_id>/<uuid:user_id>', views.play),
    url('', include('django_prometheus.urls'))
]
