from fastapi import APIRouter, Depends, status
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from typing import List

from app.api.deps import get_db, get_current_user
from app.models.user import User, UserRole
from app.models.ticket import Ticket
from app.schemas.ticket import TicketCreate, TicketResponse

router = APIRouter(prefix="/tickets", tags=["Tickets"])

@router.post("", response_model=TicketResponse, status_code=status.HTTP_201_CREATED)
async def create_ticket(
    ticket_in: TicketCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new support ticket.
    """
    db_ticket = Ticket(
        title=ticket_in.title,
        description=ticket_in.description,
        attachment=ticket_in.attachment,
        created_by=current_user.id
    )
    db.add(db_ticket)
    await db.commit()
    await db.refresh(db_ticket)
    return db_ticket

@router.get("", response_model=List[TicketResponse])
async def list_tickets(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    List tickets based on user role:
    - Employees see only their own tickets.
    - Agents and Superadmins see all tickets.
    """
    if current_user.role == UserRole.EMPLOYEE:
        statement = select(Ticket).where(Ticket.created_by == current_user.id).order_by(Ticket.created_at.desc())
    else:
        statement = select(Ticket).order_by(Ticket.created_at.desc())
        
    result = await db.exec(statement)
    tickets = result.all()
    return tickets
