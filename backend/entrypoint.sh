#!/usr/bin/env bash
# Container entrypoint.
#
#   api        wait for the database, migrate, seed, then serve  (default)
#   streamlit  run the embedded planner
#   <other>    exec whatever was asked for, so `docker compose run api bash` works
set -euo pipefail

wait_for_database() {
  # Compose healthchecks cover the common case, but MySQL accepts TCP a little
  # before it will accept a query — so ask SQLAlchemy, not the socket.
  local attempts=${DB_WAIT_ATTEMPTS:-60}
  for ((i = 1; i <= attempts; i++)); do
    if python -c "
from sqlalchemy import text
from app.db import engine
with engine.connect() as c:
    c.execute(text('SELECT 1'))
" 2>/dev/null; then
      echo "database ready after ${i}s"
      return 0
    fi
    sleep 1
  done
  echo "database did not become ready after ${attempts}s" >&2
  return 1
}

case "${1:-api}" in
  api)
    wait_for_database
    echo "running migrations..."
    python -m alembic upgrade head
    echo "seeding demo data..."
    python -m app.seed
    echo "starting API on :8000"
    exec python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
    ;;

  streamlit)
    wait_for_database
    echo "starting Streamlit planner on :8501"
    cd /app/ml
    exec python -m streamlit run streamlit_app.py \
      --server.port 8501 \
      --server.address 0.0.0.0 \
      --server.headless true \
      --browser.gatherUsageStats false
    ;;

  *)
    exec "$@"
    ;;
esac
