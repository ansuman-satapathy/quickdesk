from pydantic import BaseModel
from typing import Dict

class MetricsResponse(BaseModel):
    total_tickets: int
    by_status: Dict[str, int]
    by_category: Dict[str, int]
    median_resolution_time: str
    override_percentage: float
    override_count: int
    classified_count: int
