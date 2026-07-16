from dataclasses import asdict
from fastapi import FastAPI
from fastapi import WebSocket
from fastapi import WebSocketDisconnect
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
@app.websocket("/mt5/{client_id}")
async def mt5_client(

    websocket: WebSocket,

    client_id: str

):

    # CONNECT

    await connection_manager.connect(

        client_id,

        websocket

    )

    strategy_engine.register_user(

        client_id

    )

    print(

        f"{client_id} connected."

    )

    try:

        while True:

            # RECEIVE MARKET DATA

            market_data = await websocket.receive_json()

            # PROCESS

            orders = await strategy_engine.process(

                client_id,

                market_data

            )

            # SEND ORDERS

            for order in orders:

                await connection_manager.send(

                    client_id,

                    asdict(order)

                )


    except WebSocketDisconnect:

        print(

            f"{client_id} disconnected."

        )

        strategy_engine.remove_user(

            client_id

        )

        await connection_manager.disconnect(

            client_id

        )

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        app,
        host="127.0.0.1",
        port=8000
    )