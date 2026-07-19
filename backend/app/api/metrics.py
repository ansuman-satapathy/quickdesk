from fastapi import APIRouter, Depends
from sqlmodel import select, func
from sqlmodel.ext.asyncio.session import AsyncSession
from app.api.deps import get_db, RoleChecker
from app.models.user import User
from app.models.ticket import Ticket, TicketStatus, TicketPriority, TicketCategory
from typing import Dict, Any

router = APIRouter(prefix="/metrics", tags=["Metrics"])

@router.get("/summary")
async def get_metrics_summary(
    current_user: User = Depends(RoleChecker(["agent", "superadmin"])),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """
    Retrieve aggregated dashboard metrics (Agent and Superadmin only).
    """
    # Total, open and resolved counts
    total_statement = select(func.count(Ticket.id))
    open_statement = select(func.count(Ticket.id)).where(Ticket.status == TicketStatus.OPEN)
    resolved_statement = select(func.count(Ticket.id)).where(Ticket.status == TicketStatus.RESOLVED)
    
    total_res = await db.exec(total_statement)
    open_res = await db.exec(open_statement)
    resolved_res = await db.exec(resolved_statement)
    
    total_tickets = total_res.first() or 0
    open_tickets = open_res.first() or 0
    resolved_tickets = resolved_res.first() or 0
    
    # Total users
    total_users = 0
    if current_user.role == "superadmin":
        user_statement = select(func.count(User.id))
        user_res = await db.exec(user_statement)
        total_users = user_res.first() or 0

    # Breakdown by category
    category_counts = {}
    for cat in TicketCategory:
        cat_statement = select(func.count(Ticket.id)).where(Ticket.category == cat)
        cat_res = await db.exec(cat_statement)
        count = cat_res.first() or 0
        category_counts[cat.value] = count
        
    null_cat_statement = select(func.count(Ticket.id)).where(Ticket.category == None)
    null_cat_res = await db.exec(null_cat_statement)
    category_counts["unassigned"] = null_cat_res.first() or 0

    # Breakdown by priority
    priority_counts = {}
    for prio in TicketPriority:
        prio_statement = select(func.count(Ticket.id)).where(Ticket.priority == prio)
        prio_res = await db.exec(prio_statement)
        count = prio_res.first() or 0
        priority_counts[prio.value] = count
        
    null_prio_statement = select(func.count(Ticket.id)).where(Ticket.priority == None)
    null_prio_res = await db.exec(null_prio_statement)
    priority_counts["unassigned"] = null_prio_res.first() or 0

    return {
        "total_tickets": total_tickets,
        "open_tickets": open_tickets,
        "resolved_tickets": resolved_tickets,
        "total_users": total_users,
        "category_breakdown": category_counts,
        "priority_breakdown": priority_counts
    }
