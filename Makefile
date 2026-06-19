.PHONY: help install dev test lint format docker-up docker-down bench clean

help: ## Show this help
	@grep -E '^[a-z-]+:.*##' Makefile | awk -F ':.*## ' '{printf "  %-14s %s\n", $$1, $$2}'

install: ## Install dependencies (creates venv)
	python -m venv .venv && .venv/bin/pip install -e ".[dev]"

dev: ## Start dev server with auto-reload
	.venv/bin/uvicorn server.main:app --reload

test: ## Run all tests
	.venv/bin/pytest tests/ -v

lint: ## Check code with ruff
	.venv/bin/ruff check server/ tests/
	.venv/bin/ruff format --check server/ tests/

format: ## Auto-format code
	.venv/bin/ruff format server/ tests/

docker-up: ## Start server + Redis via Docker
	docker compose up --build

docker-down: ## Stop Docker services
	docker compose down

bench: ## Run benchmarks (requires running server)
	.venv/bin/python benchmarks/run_benchmarks.py

clean: ## Remove build artifacts
	rm -rf .pytest_cache/ .ruff_cache/ build/ dist/ *.egg-info/
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
