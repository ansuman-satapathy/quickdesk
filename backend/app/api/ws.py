from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.services.websocket_service import websocket_service

router = APIRouter(tags=["WebSocket"])

@router.websocket("/ws/tickets")
async def websocket_endpoint(websocket: WebSocket):
    """Real-time ticket event stream for connected dashboard clients."""
    await websocket_service.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        websocket_service.disconnect(websocket)
