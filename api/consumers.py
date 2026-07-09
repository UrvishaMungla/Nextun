"""
WebSocket Consumer for Nextun real-time updates.
Broadcasts live trade and PnL updates to connected clients.
"""
import json
from channels.generic.websocket import AsyncWebsocketConsumer


class DashboardConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.group_name = "dashboard"
        # Join the dashboard group
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()
        # Send a welcome message
        await self.send(text_data=json.dumps({
            "type": "connection_established",
            "message": "Connected to Nextun live dashboard"
        }))

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data):
        data = json.loads(text_data)
        event_type = data.get("type", "message")
        # Echo back or broadcast
        await self.channel_layer.group_send(
            self.group_name,
            {
                "type": "broadcast_update",
                "payload": data
            }
        )

    async def broadcast_update(self, event):
        """Handler for messages broadcast to the group."""
        await self.send(text_data=json.dumps(event["payload"]))


class TradeConsumer(AsyncWebsocketConsumer):
    """WebSocket for real-time trade execution notifications."""

    async def connect(self):
        self.user = self.scope["user"]
        if self.user.is_anonymous:
            await self.close()
            return
        self.group_name = f"trades_{self.user.id}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data):
        pass  # Client doesn't send; server pushes

    async def trade_update(self, event):
        """Push trade update to client."""
        await self.send(text_data=json.dumps(event["data"]))
