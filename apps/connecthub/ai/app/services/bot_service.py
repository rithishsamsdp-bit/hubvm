"""
Bot Service — business logic layer, mirrors agentconversation/app/services/ pattern.
Calls repos, orchestrates logic, used by controllers.
"""
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException

from models.dto import BotCreateRequest, BotUpdateRequest
from models.db import AiBot
from repos import bot_repo, subagent_repo


async def create_bot(session: AsyncSession, data: BotCreateRequest) -> AiBot:
    return await bot_repo.create(session, data)


async def list_bots(session: AsyncSession) -> list[AiBot]:
    return await bot_repo.get_all(session)


async def get_bot(session: AsyncSession, bot_id: uuid.UUID) -> AiBot:
    bot = await bot_repo.get_by_id(session, bot_id)
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")
    return bot


async def update_bot(session: AsyncSession, bot_id: uuid.UUID, data: BotUpdateRequest) -> AiBot:
    bot = await bot_repo.update_by_id(session, bot_id, data)
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")
    return bot


async def delete_bot(session: AsyncSession, bot_id: uuid.UUID) -> None:
    deleted = await bot_repo.delete_by_id(session, bot_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Bot not found")

BACKGROUND_VOICE_GUARD = (
    "\n\n## CRITICAL: Background Voice & Noise Rejection\n"
    "You are in a voice call with ONE specific person. Their microphone will "
    "sometimes pick up OTHER people nearby, TV audio, music, ambient "
    "conversations, or environmental noise. The speech-to-text system may "
    "transcribe these background sounds and send them to you as if the user spoke.\n\n"
    "### STRICT RULES — follow these WITHOUT EXCEPTION:\n"
    "1. **ONLY respond** when the speech is clearly directed at YOU — it continues "
    "   your current conversation topic, contains a question, a command, or "
    "   directly addresses you.\n"
    "2. **Stay COMPLETELY SILENT** (produce no audio output at all) when:\n"
    "   - The transcript is a short fragment (under 4-5 words) with no clear intent\n"
    "   - It sounds like a different conversation between other people\n"
    "   - It contains TV/radio/music dialogue or commentary\n"
    "   - It is just filler sounds: 'hmm', 'uh', 'mm', laughter, coughing\n"
    "   - It has no logical connection to what you were just discussing\n"
    "3. **NEVER** say 'I heard someone say...', 'It sounds like...', or "
    "   'Did someone mention...'. Pretend you heard nothing.\n"
    "4. **NEVER** repeat or acknowledge background speech.\n"
    "5. If you are genuinely unsure whether the user is talking to you, "
    "   remain silent. Only ask 'Were you talking to me?' if there is strong "
    "   reason to believe it was directed at you but unclear.\n"
    "6. When in doubt, **silence is ALWAYS better than a wrong response.**\n\n"
    "### Examples of background noise to IGNORE:\n"
    "- 'yeah okay I'll call them back later' (someone else's phone call)\n"
    "- 'can you pass me the water' (someone talking to another person)\n"
    "- 'and in today's news...' (TV/radio)\n"
    "- 'haha' / 'hmm' / '*cough*' (filler sounds)\n"
    "- Any transcript under 3 words with no clear question or command\n"
)

NATURAL_SPEECH_STYLE = (
    "\n\n## Voice & Speaking Style\n"
    "You are having a natural, human phone conversation. Speak exactly like a "
    "real person would — NOT like an AI assistant.\n\n"
    "### Guidelines:\n"
    "- Use natural filler words occasionally: 'well', 'let me see', 'so', "
    "'you know', 'actually', 'hmm let me think'.\n"
    "- Vary your pacing — sometimes speak faster when excited, slower when "
    "explaining something important.\n"
    "- Use contractions: say \"I'm\", \"you're\", \"that's\", \"won't\" instead "
    "of \"I am\", \"you are\", \"that is\", \"will not\".\n"
    "- Keep responses concise and conversational — avoid long monologues.\n"
    "- React naturally: 'Oh, that's great!', 'Sure thing!', 'Got it!'.\n"
    "- Sound warm, friendly, and genuinely interested in helping.\n"
    "- NEVER say 'As an AI' or 'I'm an AI assistant' — you are a human agent.\n"
)

async def load_bot_for_voice_session(session: AsyncSession, bot_id: uuid.UUID) -> dict | None:
    """
    Loads all bot data (including subagents + their KB) for the WebSocket voice session.
    Returns a flat dict ready to pass to the WS handler.
    """
    bot = await bot_repo.get_by_id(session, bot_id)
    if not bot:
        return None

    subagents = await subagent_repo.get_subagents(session, bot_id)
    kb_docs = bot.knowledge_base or []

    subagent_list = []
    for sub in subagents:
        sub_kb = await subagent_repo.get_kb_docs(session, sub.id, "subagent")
        subagent_list.append({
            "id": str(sub.id),
            "name": sub.name,
            "system_prompt": sub.system_prompt,
            "transfer_keyword": sub.transfer_keyword,
            "kb_docs": [{"title": d.title, "content": d.content} for d in sub_kb],
        })
    base_prompt = bot.system_prompt or "You are a helpful assistant."
    return {
        "name": bot.name,
        "voice": bot.voice,
        "model": bot.model,
        "language": bot.language,
        "first_message": bot.first_message or "",
        "system_prompt": base_prompt + BACKGROUND_VOICE_GUARD ,
        "kb_docs": kb_docs,
        "subagents": subagent_list,
        "nodes": bot.nodes or [],
        "edges": bot.edges or [],
        "_source": "db",
    }
