from fastapi import FastAPI
from pydantic import BaseModel

from api.dbtp_dbbtm import get_signal

app = FastAPI()


class SignalRequest(BaseModel):
    symbol: str
    timeframe: str


@app.get("/")
def root():
    return {"status": "alive"}


@app.post("/signal")
def signal(req: SignalRequest):
    return get_signal(req.symbol, req.timeframe)