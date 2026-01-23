# Makefile for Geode documentation site

.PHONY: help build serve clean deploy

help:
	@echo "Geode Documentation - Available targets:"
	@echo "  make build   - Build production site"
	@echo "  make serve   - Serve locally for development"
	@echo "  make clean   - Clean build artifacts"
	@echo "  make deploy  - Deploy to GitLab Pages"

build:
	@echo "Building production site..."
	hugo --minify --gc -b https://geodedb.com

serve:
	@echo "Starting development server at http://localhost:1313"
	hugo server -D --bind 0.0.0.0

clean:
	@echo "Cleaning build artifacts..."
	rm -rf public/ resources/_gen/

deploy: build
	@echo "Site built. Push to main branch to deploy via GitLab CI/CD"
	@echo "Run: git push origin main"
