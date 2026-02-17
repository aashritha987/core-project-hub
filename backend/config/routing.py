from channels.routing import URLRouter
from django.urls import path
from hub.consumers import NotificationConsumer

websocket_urlpatterns = [
    path('ws/notifications/', NotificationConsumer.as_asgi()),
]

application = URLRouter(websocket_urlpatterns)
