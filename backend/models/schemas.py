"""Pydantic schemas for the SIGNAL API."""
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class StatusResponse(BaseModel):
    service: str = "SIGNAL"
    arkham: str  # "online" | "offline"
    ai: bool
    model: Optional[str] = None
    detail: Optional[str] = None


class EntityCatalog(BaseModel):
    categories: Dict[str, str]
    entities: Dict[str, List[str]]
    tokens: List[str]
    chains: List[str]
    time_windows: List[str]


class ContentRequest(BaseModel):
    data_type: str = Field("whale_transfer", description="whale_transfer | entity_profile | token_flow | trending")
    raw_data: Any = Field(default_factory=dict, description="Actual Arkham response data to ground the model")
    tone: str = Field("analyst", description="analyst | alpha_caller | degen")
    output_type: str = Field("thread", description="thread | tweet | alert")


class ContentResponse(BaseModel):
    content: str
    tone: str
    output_type: str
    char_count: int
    tweet_count: int
