import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    # Supabase -> service-role key only, server-side. Never sent to the client.
    SUPABASE_URL: str = os.environ.get("SUPABASE_URL")
    SUPABASE_KEY: str = os.environ.get("SUPABASE_KEY")

    # OpenRouter — server-side only, output cached in Supabase (see services/insight_generator.py)
    OPENROUTER_API_KEY: str = os.environ.get("OPENROUTER_API_KEY")
    OPENROUTER_MODEL: str = os.environ.get("OPENROUTER_MODEL", "mistralai/ministral-3b-2512")
    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1/chat/completions"

    # Demo mode — when true, insight_generator serves cached text only and
    # never calls OpenRouter on the critical path. Flip to "false" once the
    # OpenRouter key is confirmed stable, right before the demo, not during it.
    DEMO_MODE: bool = os.environ.get("DEMO_MODE", "false").lower() == "true"

    # The single demo household this entire MVP is scoped to.
    DEMO_HOUSEHOLD_ID: str = os.environ.get("DEMO_HOUSEHOLD_ID", "11111111-1111-1111-1111-111111111111")

    FLASK_ENV: str = os.environ.get("FLASK_ENV", "production")
    PORT: int = int(os.environ.get("PORT", "8080"))

    @classmethod
    def validate(cls) -> list[str]:
        """Returns a list of missing/problematic config. Call at startup, log, don't crash —
        a hackathon demo with a mock fallback should still boot without Supabase configured."""
        warnings = []
        if not cls.SUPABASE_URL or not cls.SUPABASE_KEY:
            warnings.append("Supabase not configured — falling back to in-memory mock data.")
        if not cls.OPENROUTER_API_KEY and not cls.DEMO_MODE:
            warnings.append("OPENROUTER_API_KEY missing and DEMO_MODE is false — insight calls will fail.")
        return warnings
