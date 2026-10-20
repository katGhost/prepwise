"""
app.py
------
Flask app factory. Serves the JSON API under /api/* and the built React app
(static/) for everything else, so a single container + single port covers
both (see Dockerfile).
"""

import logging

from flask import Flask, jsonify, send_from_directory

from config import Config
from routes import events, household, insights, areas, notifications
from scheduler import start_scheduler


def create_app() -> Flask:
    app = Flask(__name__, static_folder="static", static_url_path="")

    for warning in Config.validate():
        logging.warning(warning)

    app.register_blueprint(household.bp)
    app.register_blueprint(events.bp)
    app.register_blueprint(insights.bp)
    app.register_blueprint(areas.bp)
    app.register_blueprint(notifications.bp)

    @app.get("/api/health")
    def health():
        return jsonify({"status": "ok", "demo_mode": Config.DEMO_MODE})

    # Serve the built React app for any non-API route (client-side routing friendly).
    @app.get("/")
    @app.get("/<path:path>")
    def serve_frontend(path: str = ""):
        if path and (app.static_folder is not None):
            full_path = f"{app.static_folder}/{path}"
            import os

            if os.path.isfile(full_path):
                return send_from_directory(app.static_folder, path)
        return send_from_directory(app.static_folder, "index.html")

    return app


app = create_app()

if __name__ == "__main__":
    start_scheduler()
    app.run(host="0.0.0.0", port=Config.PORT, debug=Config.FLASK_ENV != "production")
