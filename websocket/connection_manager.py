from fastapi import WebSocket


class ConnectionManager:

    def __init__(self):

        # client_id -> websocket

        self.connections = {}

    async def connect(
        self,
        client_id: str,
        websocket: WebSocket
    ):

        await websocket.accept()

        self.connections[client_id] = websocket

        print(
            f"{client_id} connected."
        )

    async def disconnect(
        self,
        client_id: str
    ):

        if client_id in self.connections:

            del self.connections[
                client_id
            ]

            print(
                f"{client_id} disconnected."
            )

    async def send(
        self,
        client_id: str,
        signal: dict
    ):

        websocket = self.connections.get(
            client_id
        )

        if websocket is None:

            return

        await websocket.send_json(
            signal
        )