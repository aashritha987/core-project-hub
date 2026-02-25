from channels.routing import URLRouter
from django.urls import path
from hub.consumers import ChatConsumer, NotificationConsumer

websocket_urlpatterns = [
    path('ws/notifications/', NotificationConsumer.as_asgi()),
    path('ws/chat/<str:room_uid>/', ChatConsumer.as_asgi()),
]

application = URLRouter(websocket_urlpatterns)
