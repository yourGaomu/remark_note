#!/bin/sh

set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
PROJECT_DIR=${EBK_PROJECT_DIR:-$SCRIPT_DIR}
COMPOSE_FILE=${EBK_COMPOSE_FILE:-$PROJECT_DIR/compose.prod.yaml}
ENV_FILE=${EBK_ENV_FILE:-$PROJECT_DIR/.env}
SERVICE=ezbookkeeping

if [ ! -f "$COMPOSE_FILE" ]; then
  printf 'compose file not found: %s\n' "$COMPOSE_FILE" >&2
  exit 1
fi

cd "$PROJECT_DIR"

if [ -f "$ENV_FILE" ]; then
  compose() {
    docker compose --project-directory "$PROJECT_DIR" --file "$COMPOSE_FILE" --env-file "$ENV_FILE" "$@"
  }
else
  compose() {
    docker compose --project-directory "$PROJECT_DIR" --file "$COMPOSE_FILE" "$@"
  }
fi

printf 'Project: %s\n' "$PROJECT_DIR"
printf 'Service: %s\n' "$SERVICE"

compose config --quiet
compose pull "$SERVICE"
compose up -d --force-recreate --remove-orphans "$SERVICE"
compose ps
