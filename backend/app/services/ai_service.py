import json
import logging
from typing import Dict, Any, Optional
from langchain_nvidia_ai_endpoints import ChatNVIDIA
from app.core.config import settings

logger = logging.getLogger(__name__)

class AIService:
    def __init__(self):
        pass

    def _get_client(self) -> Optional[ChatNVIDIA]:
        api_key = settings.NVIDIA_API_KEY
        if not api_key:
            return None
        return ChatNVIDIA(
            model=settings.NVIDIA_MODEL,
            api_key=api_key,
            temperature=0.2,
            top_p=0.95,
            max_completion_tokens=1024,
        )

    async def classify_ticket(self, title: str, description: str) -> Dict[str, str]:
        """
        Classifies a support ticket into category and priority using NVIDIA NIM (ChatNVIDIA).
        Returns a dict with 'ai_category' and 'ai_priority'.
        """
        client = self._get_client()
        if not client:
            print("[AI Service] NVIDIA_API_KEY missing. Defaulting to 'other' / 'medium'.")
            logger.warning("NVIDIA_API_KEY missing. Defaulting AI classification to 'other' and 'medium'.")
            return {"ai_category": "other", "ai_priority": "medium"}

        prompt = f"""You are an intelligent IT and Operations helpdesk classifier.
                Analyze the following support ticket title and description, and classify it into an appropriate category and priority level.

                Valid Categories: ["it", "hr", "finance", "admin", "other"]
                Valid Priorities: ["low", "medium", "high"]

                Ticket Title: {title}
                Ticket Description: {description}

                Return ONLY raw JSON with no markdown formatting or extra commentary:
                {{"ai_category": "...", "ai_priority": "..."}}
                """

        messages = [
            {"role": "user", "content": prompt}
        ]

        try:
            print(f"[AI Service] Calling NVIDIA NIM ({settings.NVIDIA_MODEL}) for title: '{title}'...")
            response = await client.ainvoke(messages)
            content = str(response.content).strip()

            if content.startswith("```"):
                lines = content.splitlines()
                if lines[0].startswith("```"):
                    lines = lines[1:]
                if lines and lines[-1].startswith("```"):
                    lines = lines[:-1]
                content = "\n".join(lines).strip()

            parsed = json.loads(content)
            category = parsed.get("ai_category", "other").lower()
            priority = parsed.get("ai_priority", "medium").lower()

            valid_categories = ["it", "hr", "finance", "admin", "other"]
            valid_priorities = ["low", "medium", "high"]

            if category not in valid_categories:
                category = "other"
            if priority not in valid_priorities:
                priority = "medium"

            print(f"[AI Service] Classification Success: category='{category}', priority='{priority}'")
            return {
                "ai_category": category,
                "ai_priority": priority
            }
        except Exception as e:
            print(f"[AI Service ERROR] Classification failed: {e}")
            logger.error(f"Error classifying ticket with NVIDIA NIM: {e}", exc_info=True)
            return {"ai_category": "other", "ai_priority": "medium"}

ai_service = AIService()
