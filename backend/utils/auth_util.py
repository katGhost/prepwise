import os
import jwt
from functools import wraps
from flask import request, jsonify

SUPABASE_URL = os.getenv("SUPABASE_URL")
JWKS_URL = f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json"

# Built once at import time; caches keys internally and refetches on unknown kid
jwks_client = jwt.PyJWKClient(JWKS_URL)

def require_auth(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "missing token"}), 401
        token = auth_header.split(" ", 1)[1]
        try:
            signing_key = jwks_client.get_signing_key_from_jwt(token)
            payload = jwt.decode(
                token,
                signing_key.key,
                algorithms=["ES256"],
                audience="authenticated",
            )
        except jwt.InvalidTokenError as e:
            print(f"JWT verify failed: {type(e).__name__}: {e}")
            return jsonify({"error": "invalid token"}), 401
        request.household_id = payload["sub"]
        # print(payload["sub"])
        return f(*args, **kwargs)
    return wrapper