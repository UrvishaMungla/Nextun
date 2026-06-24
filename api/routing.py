"""WebSocket URL routing for Nextun."""
from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/dashboard/$', consumers.DashboardConsumer.as_asgi()),
    re_path(r'ws/trades/$', consumers.TradeConsumer.as_asgi()),
]
