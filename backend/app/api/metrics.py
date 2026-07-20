from fastapi import APIRouter, Depends
from sqlmodel.ext.asyncio.session import AsyncSession

from app.api.deps import get_db, RoleChecker
from app.schemas.metrics import MetricsResponse
from app.services.metrics_service import MetricsService

router = APIRouter(prefix="/metrics", tags=["Metrics"])

@router.get("", response_model=MetricsResponse)
async def get_dashboard_metrics(
    current_user = Depends(RoleChecker(["agent", "superadmin"])),
    db: AsyncSession = Depends(get_db)
):
    """
    Get dashboard metrics for agents and superadmins:
    - Total tickets by status (Open / Resolved)
    - Tickets by category (count)
    - Median resolution time
    - Agent category override percentage
    """
    return await MetricsService.get_metrics(db)
