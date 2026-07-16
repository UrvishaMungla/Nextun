import json
import uvicorn
from dataclasses import asdict

from fastapi import FastAPI, WebSocket, WebSocketDisconnect

from websocket.connection_manager import ConnectionManager
from strategy_engine import StrategyEngine

app = FastAPI()

connection_manager = ConnectionManager()
strategy_engine = StrategyEngine()


@app.get("/")
async def health():
    return {
        "status": "running",
        "service": "Trading Bridge"
    }


def decode_packet(message):

    if message["type"] == "websocket.disconnect":
        raise WebSocketDisconnect()

    if message.get("bytes") is not None:
        return json.loads(
            message["bytes"].decode("utf-8")
        )

    if message.get("text") is not None:
        return json.loads(
            message["text"]
        )

    return None


@app.websocket("/ws")
async def mt5_client(websocket: WebSocket):

    await websocket.accept()

    client_id = None

    try:

        # ---------------- Registration ----------------

        packet = decode_packet(
            await websocket.receive()
        )

        if packet is None:
            await websocket.close()
            return

        if packet.get("type") != "register":
            await websocket.close()
            return

        client_id = packet["client_id"]

        await connection_manager.connect(
            client_id,
            websocket
        )

        print(f"{client_id} connected")

        # ---------------- Main Loop ----------------

        while True:

            packet = decode_packet(
                await websocket.receive()
            )
            print(packet)

            if packet is None:
                continue

            packet_type = packet.get("type")

            

            # Ignore duplicate register packets
            if packet_type == "register":
                continue

            # Execution reports coming back from MT5
            if packet_type == "execution_report":
                print("Execution:", packet)
                continue

    # History candles
            if packet_type == "history":
                strategy_engine.update_market(packet)
                continue

            # Live candles
            if packet_type == "market_data":

                orders = await strategy_engine.process(
                    client_id,
                    packet
                )

        for order in orders:
            await connection_manager.send(
                client_id,
                asdict(order)
            )

            continue

    except WebSocketDisconnect:

        print(f"{client_id} disconnected")

    finally:

        if client_id:

            await connection_manager.disconnect(
                client_id
            )


if __name__ == "__main__":

    uvicorn.run(
        app,
        host="127.0.0.1",
        port=8000
    )