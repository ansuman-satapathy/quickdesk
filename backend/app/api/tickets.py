from fastapi import APIRouter, Depends, status, HTTPException
from fastapi.encoders import jsonable_encoder
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.orm import selectinload
from typing import List
import uuid
from datetime import datetime, timezone

from app.api.deps import get_db, get_current_user, RoleChecker
from app.models.user import User, UserRole
from app.models.ticket import Ticket, TicketStatus
from app.models.audit_log import AuditLog
from app.schemas.ticket import TicketCreate, TicketResponse, TicketUpdate, TicketReply
from app.services.websocket_service import websocket_service

router = APIRouter(prefix="/tickets", tags=["Tickets"])

def _get_val_str(val):
    if val is None:
        return None
    return val.value if hasattr(val, "value") else str(val)

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
    
    # Eagerly load relationships to avoid lazy load failures
    statement = (
        select(Ticket)
        .where(Ticket.id == db_ticket.id)
        .options(selectinload(Ticket.creator), selectinload(Ticket.resolver))
    )
    result = await db.exec(statement)
    ticket_out = result.one()
    await websocket_service.broadcast({
        "event": "ticket_created",
        "ticket": jsonable_encoder(ticket_out)
    })
    return ticket_out

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
        statement = (
            select(Ticket)
            .where(Ticket.created_by == current_user.id)
            .options(selectinload(Ticket.creator), selectinload(Ticket.resolver))
            .order_by(Ticket.created_at.desc())
        )
    else:
        statement = (
            select(Ticket)
            .options(selectinload(Ticket.creator), selectinload(Ticket.resolver))
            .order_by(Ticket.created_at.desc())
        )
        
    result = await db.exec(statement)
    tickets = result.all()
    return tickets

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
    ticket = await db.get(Ticket, ticket_id)
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found"
        )

    audit_logs = []
    
    if ticket_update.status is not None and ticket.status != ticket_update.status:
        audit_logs.append(
            AuditLog(
                ticket_id=ticket.id,
                agent_id=current_user.id,
                field="status",
                old_value=_get_val_str(ticket.status),
                new_value=_get_val_str(ticket_update.status)
            )
        )
        ticket.status = ticket_update.status

    if ticket_update.priority is not None and ticket.priority != ticket_update.priority:
        audit_logs.append(
            AuditLog(
                ticket_id=ticket.id,
                agent_id=current_user.id,
                field="priority",
                old_value=_get_val_str(ticket.priority),
                new_value=_get_val_str(ticket_update.priority)
            )
        )
        ticket.priority = ticket_update.priority

    if ticket_update.category is not None and ticket.category != ticket_update.category:
        audit_logs.append(
            AuditLog(
                ticket_id=ticket.id,
                agent_id=current_user.id,
                field="category",
                old_value=_get_val_str(ticket.category),
                new_value=_get_val_str(ticket_update.category)
            )
        )
        ticket.category = ticket_update.category

    if audit_logs:
        ticket.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
        db.add(ticket)
        for log in audit_logs:
            db.add(log)
        await db.commit()
    
    # Eagerly load relationships to avoid lazy load failures
    statement = (
        select(Ticket)
        .where(Ticket.id == ticket.id)
        .options(selectinload(Ticket.creator), selectinload(Ticket.resolver))
    )
    result = await db.exec(statement)
    ticket_out = result.one()
    await websocket_service.broadcast({
        "event": "ticket_updated",
        "ticket": jsonable_encoder(ticket_out)
    })
    return ticket_out

@router.post("/{ticket_id}/reply", response_model=TicketResponse)
async def reply_ticket(
    ticket_id: uuid.UUID,
    reply_in: TicketReply,
    current_user: User = Depends(RoleChecker(["agent", "superadmin"])),
    db: AsyncSession = Depends(get_db)
):
    """
    Submit final resolution reply, resolving the ticket.
    """
    ticket = await db.get(Ticket, ticket_id)
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found"
        )

    if ticket.status != TicketStatus.RESOLVED:
        log = AuditLog(
            ticket_id=ticket.id,
            agent_id=current_user.id,
            field="status",
            old_value=_get_val_str(ticket.status),
            new_value=_get_val_str(TicketStatus.RESOLVED)
        )
        db.add(log)

    ticket.final_reply = reply_in.reply
    ticket.status = TicketStatus.RESOLVED
    ticket.resolved_by = current_user.id
    ticket.resolved_at = datetime.now(timezone.utc).replace(tzinfo=None)
    ticket.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)

    db.add(ticket)
    await db.commit()

    # Eagerly load relationships to avoid lazy load failures
    statement = (
        select(Ticket)
        .where(Ticket.id == ticket.id)
        .options(selectinload(Ticket.creator), selectinload(Ticket.resolver))
    )
    result = await db.exec(statement)
    ticket_out = result.one()
    await websocket_service.broadcast({
        "event": "ticket_resolved",
        "ticket": jsonable_encoder(ticket_out)
    })
    return ticket_out
