import os
import re
import logging
from typing import List, Dict, Any, Optional

from langchain_community.document_loaders import DirectoryLoader, TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_chroma import Chroma
from langchain_nvidia_ai_endpoints import ChatNVIDIA, NVIDIAEmbeddings
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

from app.core.config import settings

logger = logging.getLogger(__name__)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
KB_DIR = os.path.abspath(os.path.join(BASE_DIR, "knowledge_base"))
CHROMA_DB_DIR = os.path.abspath(os.path.join(BASE_DIR, "chroma_db"))

class RAGService:
    def __init__(self, kb_dir: str = KB_DIR, chroma_dir: str = CHROMA_DB_DIR):
        self.kb_dir = kb_dir
        self.chroma_dir = chroma_dir
        self.vectorstore: Optional[Chroma] = None

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

    def _get_embeddings(self) -> Optional[NVIDIAEmbeddings]:
        api_key = settings.NVIDIA_API_KEY
        if not api_key:
            return None
        return NVIDIAEmbeddings(
            api_key=api_key,
            model="nvidia/nv-embedqa-e5-v5"
        )

    def get_vectorstore(self) -> Optional[Chroma]:
        """
        Initializes and returns the Chroma Vector DB instance populated with Knowledge Base embeddings.
        """
        if self.vectorstore is not None:
            return self.vectorstore

        embeddings = self._get_embeddings()
        if not embeddings or not os.path.exists(self.kb_dir):
            return None

        try:
            # LangChain Document Loader
            loader = DirectoryLoader(self.kb_dir, glob="*.md", loader_cls=TextLoader)
            documents = loader.load()

            if not documents:
                return None

            # LangChain Text Splitter
            splitter = RecursiveCharacterTextSplitter(chunk_size=600, chunk_overlap=80)
            chunks = splitter.split_documents(documents)

            # Create persistent Chroma Vector DB
            self.vectorstore = Chroma.from_documents(
                documents=chunks,
                embedding=embeddings,
                persist_directory=self.chroma_dir
            )
            print(f"[RAGService] Loaded Chroma Vector DB with {len(chunks)} document vector embeddings.")
            return self.vectorstore
        except Exception as e:
            logger.error(f"[RAGService] Failed to initialize Chroma Vector DB: {e}")
            return None

    def _is_relevant(self, query: str, docs: List[Any]) -> bool:
        """
        Validates keyword relevance score to enforce non-hallucination bounds.
        """
        if not docs:
            return False

        cleaned_query = re.sub(r'[^\w\s]', ' ', query.lower())
        query_words = set(cleaned_query.split())

        for doc in docs:
            doc_content_lower = doc.page_content.lower()
            for word in query_words:
                if len(word) > 2 and word in doc_content_lower:
                    return True

        return False

    async def generate_draft_reply(self, title: str, description: str) -> Dict[str, Any]:
        """
        Performs semantic vector similarity search via Chroma Vector DB,
        retrieves top matching context, and runs a LangChain runnable chain.
        """
        query_text = f"{title} {description}"
        FALLBACK_REPLY = "No relevant knowledge base article found for this ticket."

        vectorstore = self.get_vectorstore()
        if not vectorstore:
            return {
                "ai_draft": FALLBACK_REPLY,
                "citations": []
            }

        retriever = vectorstore.as_retriever(search_kwargs={"k": 2})
        retrieved_docs = retriever.invoke(query_text)

        if not self._is_relevant(query_text, retrieved_docs):
            logger.info(f"[RAGService] Query '{title}' did not match Knowledge Base articles in Chroma Vector DB.")
            return {
                "ai_draft": FALLBACK_REPLY,
                "citations": []
            }

        citations = list(set([
            os.path.basename(doc.metadata.get("source", "KB"))
            for doc in retrieved_docs
        ]))

        context_str = "\n\n---\n\n".join([
            f"Source Article: {os.path.basename(doc.metadata.get('source', 'KB'))}\nContent:\n{doc.page_content}"
            for doc in retrieved_docs
        ])

        client = self._get_client()
        if not client:
            return {
                "ai_draft": f"Refer to Knowledge Base articles ({', '.join(citations)}) for guidance.",
                "citations": citations
            }

        prompt = ChatPromptTemplate.from_messages([
            (
                "system",
                "You are an AI Helpdesk Assistant.\n"
                "Draft a direct resolution response for an IT support ticket based STRICTLY on the provided Knowledge Base Context below.\n\n"
                "FORMATTING RULES:\n"
                "- Do NOT include email headers, Subject lines, or salutations like 'Dear [User]'.\n"
                "- Do NOT include sign-offs or bracketed placeholders like '[Your Name]' or '[User]'.\n"
                "- Write a direct, clear, step-by-step resolution message ready for the agent to send.\n"
                "- If the Knowledge Base Context does NOT contain information relevant to the ticket, reply ONLY with: 'No relevant knowledge base article found for this ticket.' Do not hallucinate.\n\n"
                "Knowledge Base Context:\n---\n{context}\n---"
            ),
            (
                "user",
                "Ticket Title: {title}\nTicket Description: {description}\n\nDraft Resolution Reply:"
            )
        ])

        chain = prompt | client | StrOutputParser()

        try:
            ai_draft = await chain.ainvoke({
                "context": context_str,
                "title": title,
                "description": description
            })
            return {
                "ai_draft": ai_draft.strip(),
                "citations": citations
            }
        except Exception as e:
            logger.error(f"[RAGService] Exception executing LangChain chain: {e}")
            return {
                "ai_draft": f"Refer to KB articles ({', '.join(citations)}) for guidance.",
                "citations": citations
            }

rag_service = RAGService()
