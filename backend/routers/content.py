"""Claude/MiMo content engine — analyze on-chain data + generate X/Twitter content."""
import re

from fastapi import APIRouter, HTTPException

from models.schemas import ContentRequest, ContentResponse
from services.ai import AIError, ai

router = APIRouter(prefix="/content", tags=["content"])

SYSTEM_PROMPT = (
    "You are a crypto on-chain intelligence analyst. You write Twitter/X content "
    "based on real blockchain data. Be factual, data-driven, and never give financial "
    "advice. Always cite specific numbers, wallet labels, and transaction hashes when "
    "available. Output ONLY the requested content format, no explanation."
)

TONE_GUIDE = {
    "analyst": "Tone: analyst — professional, cite the data, add context about what this means.",
    "alpha_caller": "Tone: alpha_caller — excited, use the 🚨 emoji, focus on the opportunity.",
    "degen": "Tone: degen — casual, use crypto slang, call it like you see it.",
}

OUTPUT_GUIDE = {
    "thread": "Format: a thread of 4-6 tweets, each numbered like (1/) (2/) ... and each under 280 characters.",
    "tweet": "Format: a single tweet under 280 characters.",
    "alert": "Format: one-line breaking-news style alert.",
}


def _money(v) -> str:
    try:
        return f"{float(v):,.0f}"
    except (TypeError, ValueError):
        return "n/a"


def _g(d: dict, key, default="n/a"):
    val = d.get(key) if isinstance(d, dict) else None
    return default if val in (None, "") else val


def _build_prompt(data_type: str, d, tone: str, output_type: str) -> str:
    tone_block = TONE_GUIDE.get(tone, TONE_GUIDE["analyst"])
    out_block = OUTPUT_GUIDE.get(output_type, OUTPUT_GUIDE["thread"])
    d = d if isinstance(d, dict) else {"data": d}

    if data_type == "whale_transfer":
        body = (
            f"On-chain data detected. Generate a Twitter {output_type} about this whale movement.\n\n"
            f"TRANSACTION DATA:\n"
            f"- From: {_g(d, 'from_entity', 'Unknown')} ({_g(d, 'from_label', 'unlabeled')})\n"
            f"- To: {_g(d, 'to_entity', 'Unknown')} ({_g(d, 'to_label', 'unlabeled')})\n"
            f"- Amount: ${_money(d.get('usd_value'))} worth of {_g(d, 'token_symbol', 'tokens')}\n"
            f"- Chain: {_g(d, 'chain')}\n"
            f"- TX Hash: {_g(d, 'hash')}\n"
            f"- Time: {_g(d, 'timestamp')}\n"
        )
    elif data_type == "entity_profile":
        entity = d.get("entity") or {}
        balances = d.get("balances") or {}
        body = (
            f"Generate a Twitter {output_type} profiling this crypto entity based on on-chain data.\n\n"
            f"ENTITY DATA:\n"
            f"- Name: {_g(entity, 'name')}\n"
            f"- Type: {_g(entity, 'type')} (CEX/VC/Market Maker/Whale/Unknown)\n"
            f"- Total Portfolio Value: ${_money(balances.get('total_usd'))}\n"
            f"- Top Holdings: {balances.get('top_tokens') or 'n/a'}\n"
            f"- Recent Counterparties: {d.get('counterparties') or 'n/a'}\n"
        )
    elif data_type == "token_flow":
        slug = str(_g(d, 'token_slug', '')).upper()
        body = (
            f"Generate a Twitter {output_type} about token flow intelligence.\n\n"
            f"TOKEN: {_g(d, 'token_name')} ({slug})\n"
            f"TIMEFRAME: {_g(d, 'time_last')}\n"
            f"NET FLOW: {d.get('net_flow')} (positive = accumulation, negative = distribution)\n"
            f"TOP INFLOWS FROM: {d.get('top_inflows') or 'n/a'}\n"
            f"TOP OUTFLOWS TO: {d.get('top_outflows') or 'n/a'}\n"
        )
    elif data_type == "trending":
        body = (
            f"Generate a Twitter {output_type} about what is trending on-chain right now.\n\n"
            f"TRENDING TOKENS DATA:\n{d.get('tokens') or d}\n"
        )
    else:
        body = (
            f"Generate a Twitter {output_type} based on this on-chain data.\n\n"
            f"DATA:\n{d}\n"
        )

    return f"{body}\n{tone_block}\n{out_block}"


def _tweet_count(content: str, output_type: str) -> int:
    if output_type != "thread":
        return 1
    # match numbered markers at line start, with or without parens: "(1/" or "1/"
    markers = re.findall(r"(?:^|\n)\s*\(?\s*\d+\s*/", content)
    return max(1, len(markers))


@router.post("/generate", response_model=ContentResponse)
async def generate(req: ContentRequest):
    prompt = _build_prompt(req.data_type, req.raw_data, req.tone, req.output_type)
    try:
        content = await ai.complete(SYSTEM_PROMPT, prompt, max_tokens=1000)
    except AIError as exc:
        raise HTTPException(status_code=502, detail=f"AI generation failed: {exc}")
    return ContentResponse(
        content=content,
        tone=req.tone,
        output_type=req.output_type,
        char_count=len(content),
        tweet_count=_tweet_count(content, req.output_type),
    )
