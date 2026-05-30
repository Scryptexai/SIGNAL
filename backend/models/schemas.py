"""Pydantic response models for the SIGNAL API."""
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class StatusResponse(BaseModel):
    service: str = "SIGNAL"
    arkham: str  # "online" | "offline"
    claude: bool
    detail: Optional[str] = None


class EntityCatalog(BaseModel):
    categories: Dict[str, str]
    entities: Dict[str, List[str]]
    tokens: List[str]
    chains: List[str]
    time_windows: List[str]


class ContentRequest(BaseModel):
    mode: str = Field("analysis", description="analysis | social | alert")
    subject: str = Field(..., description="What the content is about")
    data: Any = Field(None, description="Raw on-chain JSON context to ground the model")
    tone: Optional[str] = None


class ContentResponse(BaseModel):
    mode: str
    subject: str
    model: str
    content: str
