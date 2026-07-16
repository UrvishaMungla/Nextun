import MetaTrader5 as mt5
import uvicorn
from fastapi import FastAPI
from pydantic import BaseModel

from api.dbtp_dbbtm import get_signal

app = FastAPI()


if not mt5.initialize():
    raise RuntimeError("Failed to initialize MT5")

class SignalRequest(BaseModel):
    symbol: str
    timeframe: str


@app.get("/")
def root():
    return {"status": "alive"}


@app.post("/signal")
def signal(req: SignalRequest):
    return get_signal(req.symbol, req.timeframe)

if __name__ == "__main__":
    uvicorn.run(
        "bridge_server:app",      
        host="0.0.0.0",
        port=8000,
        reload=True
        )