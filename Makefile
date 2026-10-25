# Rent Platform — developer commands
# `make dev` brings the full stack up: infra + lint + tests + API (watch).

SHELL := /bin/bash

.PHONY: help dev down restart test lint typecheck build fmt ci smoke

help:
	@grep -E '^[a-z-]+:' Makefile

dev: up deps db-migrate test
	@echo "-- dev stack up (postgres on :5432, redis on :6379). Starting api in watch mode (Ctrl+C to stop) --"
	cd apps/api && LOG_PRETTY=1 pnpm dev

up:
	docker compose -f infra/docker-compose.yml up -d
	@until docker compose -f infra/docker-compose.yml exec -T postgres pg_isready -U rent -d rent >/dev/null 2>&1; do sleep 1; done
	@until docker compose -f infra/docker-compose.yml exec -T redis redis-cli ping >/dev/null 2>&1; do sleep 1; done
	@echo "-- infra ready --"

db-migrate:
	cd apps/api && pnpm db:migrate

down:
	docker compose -f infra/docker-compose.yml down

restart: down up

deps:
	pnpm install

test:
	pnpm -r test

lint:
	pnpm -r lint

typecheck:
	pnpm -r typecheck

build:
	pnpm -r build

fmt:
	pnpm format

ci: deps lint typecheck build test

