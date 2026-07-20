import statistics
from typing import Dict, Any
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.models.ticket import Ticket, TicketStatus

from app.models.audit_log import AuditLog

class MetricsService:
    @staticmethod
    async def get_metrics(db: AsyncSession) -> Dict[str, Any]:
        """
        Calculates agent dashboard metrics:
        - Total tickets by status (Open / Resolved)
        - Tickets by category count
        - Median resolution time
        - Overall AI override percentage (category, priority, reply, or audit logs)
        """
        result = await db.exec(select(Ticket))
        tickets = result.all()

        total_tickets = len(tickets)
        by_status = {"open": 0, "resolved": 0}
        by_category = {}
        resolution_times = []
        classified_count = 0
        override_count = 0

        for t in tickets:
            # Status count
            status_str = t.status.value if hasattr(t.status, "value") else str(t.status)
            by_status[status_str] = by_status.get(status_str, 0) + 1

            # Category count
            cat = t.category or t.ai_category
            if cat:
                cat_str = cat.value if hasattr(cat, "value") else str(cat)
                cat_str = cat_str.upper()
                by_category[cat_str] = by_category.get(cat_str, 0) + 1

            # Median resolution time calculation
            status_enum = t.status.value if hasattr(t.status, "value") else str(t.status)
            if status_enum == "resolved" and t.resolved_at and t.created_at:
                seconds = (t.resolved_at - t.created_at).total_seconds()
                if seconds >= 0:
                    resolution_times.append(seconds)

            # Check for ANY AI override (category, priority, reply, or audit logs)
            has_ai = (t.ai_category is not None or t.ai_priority is not None or t.ai_draft is not None)
            if has_ai:
                classified_count += 1

            res_log = await db.exec(select(AuditLog).where(AuditLog.ticket_id == t.id))
            logs = res_log.all()

            cat_overrode = (t.category is not None and t.ai_category is not None and str(t.category).lower() != str(t.ai_category).lower())
            prio_overrode = (t.priority is not None and t.ai_priority is not None and str(t.priority).lower() != str(t.ai_priority).lower())
            reply_overrode = (t.ai_draft is not None and t.final_reply is not None and t.ai_draft.strip() != t.final_reply.strip())
            has_logs = len(logs) > 0

            if cat_overrode or prio_overrode or reply_overrode or has_logs:
                override_count += 1

        # Calculate median resolution time string
        if not resolution_times:
            median_res_time = "N/A"
        else:
            med_sec = statistics.median(resolution_times)
            if med_sec < 60:
                median_res_time = f"{int(med_sec)}s"
            elif med_sec < 3600:
                median_res_time = f"{round(med_sec / 60.0, 1)}m"
            else:
                median_res_time = f"{round(med_sec / 3600.0, 1)}h"

        # Calculate override percentage
        if classified_count == 0:
            override_percentage = 0.0
        else:
            override_percentage = round((override_count / classified_count) * 100.0, 1)

        return {
            "total_tickets": total_tickets,
            "by_status": by_status,
            "by_category": by_category,
            "median_resolution_time": median_res_time,
            "override_percentage": override_percentage,
            "override_count": override_count,
            "classified_count": classified_count
        }
