import json

from fastapi import WebSocket


class ConnectionManager:

    def __init__(self):
        self.connections = {}

    async def connect(
        self,
        client_id,
        websocket
    ):

        self.connections[client_id] = websocket

    async def disconnect(
        self,
        client_id
    ):

        self.connections.pop(
            client_id,
            None
        )

    async def send(
        self,
        client_id,
        packet
    ):

        websocket = self.connections.get(
            client_id
        )

        if websocket is None:
            return

        await websocket.send_text(
            json.dumps(packet)
        )