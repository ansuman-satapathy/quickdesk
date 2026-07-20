from typing import List
import uuid
from fastapi import APIRouter, Depends, status, BackgroundTasks
from sqlmodel.ext.asyncio.session import AsyncSession

from app.api.deps import get_db, get_current_user, RoleChecker
from app.models.user import User
from app.schemas.ticket import TicketCreate, TicketResponse, TicketUpdate, TicketReply
from app.services.ticket_service import TicketService

router = APIRouter(prefix="/tickets", tags=["Tickets"])

@router.post("", response_model=TicketResponse, status_code=status.HTTP_201_CREATED)
async def create_ticket(
    ticket_in: TicketCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new support ticket immediately and queue AI classification in the background.
    """
    return await TicketService.create_ticket(db, ticket_in, current_user, background_tasks)

@router.get("", response_model=List[TicketResponse])
async def list_tickets(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    List tickets based on user role:
    - Employees see only their created tickets.
    - Agents and Superadmins see all tickets.
    """
    return await TicketService.list_tickets(db, current_user)

@router.patch("/{ticket_id}", response_model=TicketResponse)
async def update_ticket(
    ticket_id: uuid.UUID,
    ticket_update: TicketUpdate,
    current_user: User = Depends(RoleChecker(["agent", "superadmin"])),
    db: AsyncSession = Depends(get_db)
):
    """
    Update a ticket's status, priority, or category, and record changes in the AuditLog.
    """
    return await TicketService.update_ticket(db, ticket_id, ticket_update, current_user)

@router.post("/{ticket_id}/reply", response_model=TicketResponse)
async def reply_ticket(
    ticket_id: uuid.UUID,
    reply_in: TicketReply,
    current_user: User = Depends(RoleChecker(["agent", "superadmin"])),
    db: AsyncSession = Depends(get_db)
):
    """
    Submit final resolution reply, marking the ticket resolved.
    """
    return await TicketService.reply_ticket(db, ticket_id, reply_in, current_user)
