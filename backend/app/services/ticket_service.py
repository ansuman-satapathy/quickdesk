import uuid
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import BackgroundTasks, HTTPException, status
from fastapi.encoders import jsonable_encoder
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.user import User, UserRole
from app.models.ticket import Ticket, TicketStatus
from app.models.audit_log import AuditLog
from app.schemas.ticket import TicketCreate, TicketUpdate, TicketReply
from app.services.websocket_service import websocket_service
from app.services.ai_service import ai_service
from app.db.database import SessionLocal

def _get_val_str(val):
    if val is None:
        return None
    return val.value if hasattr(val, "value") else str(val)


from app.services.rag_service import rag_service

class TicketService:
    @staticmethod
    async def classify_and_update_bg(ticket_id: uuid.UUID, title: str, description: str):
        """
        Background worker to classify ticket & generate grounded RAG draft reply via LLM.
        """
        try:
            ai_result = await ai_service.classify_ticket(title, description)
            rag_result = await rag_service.generate_draft_reply(title, description)

            async with SessionLocal() as db:
                statement = (
                    select(Ticket)
                    .where(Ticket.id == ticket_id)
                    .options(selectinload(Ticket.creator), selectinload(Ticket.resolver))
                )
                result = await db.exec(statement)
                ticket = result.first()
                if ticket:
                    ticket.ai_category = ai_result.get("ai_category")
                    ticket.ai_priority = ai_result.get("ai_priority")
                    ticket.ai_draft = rag_result.get("ai_draft")
                    ticket.ai_citations = rag_result.get("citations") or []
                    ticket.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
                    db.add(ticket)
                    await db.commit()
                    await db.refresh(ticket)
                    
                    # Broadcast real-time update to all connected WebSocket clients
                    await websocket_service.broadcast({
                        "event": "ticket_updated",
                        "ticket": jsonable_encoder(ticket)
                    })
        except Exception as e:
            print(f"[TicketService BG Error] Failed to process ticket {ticket_id}: {e}")

    @classmethod
    async def create_ticket(
        cls,
        db: AsyncSession,
        ticket_in: TicketCreate,
        current_user: User,
        background_tasks: BackgroundTasks
    ) -> Ticket:
        """
        Creates a ticket in the database immediately, broadcasts the creation,
        and dispatches AI classification to a background task.
        """
        db_ticket = Ticket(
            title=ticket_in.title,
            description=ticket_in.description,
            attachment=ticket_in.attachment,
            created_by=current_user.id
        )
        db.add(db_ticket)
        await db.commit()

        statement = (
            select(Ticket)
            .where(Ticket.id == db_ticket.id)
            .options(selectinload(Ticket.creator), selectinload(Ticket.resolver))
        )
        result = await db.exec(statement)
        ticket_out = result.one()

        # Broadcast real-time ticket creation
        await websocket_service.broadcast({
            "event": "ticket_created",
            "ticket": jsonable_encoder(ticket_out)
        })

        # Queue AI classification asynchronously
        background_tasks.add_task(
            cls.classify_and_update_bg,
            db_ticket.id,
            ticket_in.title,
            ticket_in.description
        )

        return ticket_out

    @staticmethod
    async def list_tickets(db: AsyncSession, current_user: User) -> List[Ticket]:
        """
        List tickets filtered by current user role:
        - Employees see only their created tickets.
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
        return result.all()

    @staticmethod
    async def update_ticket(
        db: AsyncSession,
        ticket_id: uuid.UUID,
        ticket_update: TicketUpdate,
        current_user: User
    ) -> Ticket:
        """
        Update a ticket's status, priority, or category, and record audit log entries.
        """
        ticket = await db.get(Ticket, ticket_id)
        if not ticket:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Ticket not found"
            )

        if ticket.status == TicketStatus.RESOLVED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot edit category or priority of a resolved ticket"
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

    @staticmethod
    async def reply_ticket(
        db: AsyncSession,
        ticket_id: uuid.UUID,
        reply_in: TicketReply,
        current_user: User
    ) -> Ticket:
        """
        Submit final resolution reply, marking the ticket resolved.
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

    @staticmethod
    async def get_audit_logs(db: AsyncSession, ticket_id: uuid.UUID) -> List[AuditLog]:
        """
        Retrieve audit history logs for a specific ticket, eager loading the acting agent.
        """
        statement = (
            select(AuditLog)
            .where(AuditLog.ticket_id == ticket_id)
            .options(selectinload(AuditLog.agent))
            .order_by(AuditLog.created_at.desc())
        )
        result = await db.exec(statement)
        return result.all()

