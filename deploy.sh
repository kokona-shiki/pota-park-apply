#!/bin/bash
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info() { echo -e "${GREEN}[INFO]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

check_docker() {
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed. Please install Docker first."
    fi
    
    if ! docker compose version &> /dev/null; then
        error "Docker Compose is not installed. Please install Docker Compose first."
    fi
    
    info "Docker environment check passed"
}

check_config() {
    if [ ! -f ".env" ]; then
        warn ".env file not found, creating from template..."
        cp .env.example .env
        error "Please edit .env file with your configuration and run deploy.sh again."
    fi
    
    set -a
    source .env
    set +a
    
    if [ -z "${DB_PASSWORD}" ]; then
        error "DB_PASSWORD is required in .env file"
    fi
    
    if [ -z "${JWT_SECRET}" ]; then
        error "JWT_SECRET is required in .env file"
    fi
    
    info "Configuration check passed"
}

create_directories() {
    DATA_DIR="${DATA_DIR:-./data}"
    
    mkdir -p "${DATA_DIR}/db"
    mkdir -p "${DATA_DIR}/backups"
    mkdir -p "${DATA_DIR}/logs/backend"
    mkdir -p "${DATA_DIR}/logs/frontend"
    mkdir -p "${DATA_DIR}/logs/backup"
    mkdir -p scripts
    
    info "Data directories created at ${DATA_DIR}"
}

set_permissions() {
    chmod +x scripts/backup.sh
    chmod +x scripts/backup-entrypoint.sh
    chmod +x scripts/restore.sh
    chmod +x deploy.sh
    info "Script permissions set"
}

deploy() {
    info "Building and starting services..."
    
    docker compose down --remove-orphans 2>/dev/null || true
    
    docker compose build --no-cache
    
    docker compose up -d
    
    info "Waiting for services to be healthy..."
    sleep 10
    
    docker compose ps
}

show_status() {
    echo ""
    info "=========================================="
    info "Deployment completed!"
    info "=========================================="
    echo ""
    
    FRONTEND_PORT=$(grep -E "^FRONTEND_PORT=" .env 2>/dev/null | cut -d'=' -f2 || echo "8080")
    DATA_DIR=$(grep -E "^DATA_DIR=" .env 2>/dev/null | cut -d'=' -f2 || echo "./data")
    
    info "Access URL: http://localhost:${FRONTEND_PORT}"
    info "Data directory: ${DATA_DIR}"
    info ""
    info "Log files:"
    info "  Backend:  ${DATA_DIR}/logs/backend/"
    info "  Frontend: ${DATA_DIR}/logs/frontend/"
    info "  Backup:   ${DATA_DIR}/logs/backup/backup.log"
    info ""
    info "Useful commands:"
    info "  View logs:     docker compose logs -f"
    info "  Stop services: docker compose down"
    info "  Restart:       docker compose restart"
    info "  Backup DB:     docker exec pota-park-backup /backup.sh"
    info "  Restore DB:    ./scripts/restore.sh"
    echo ""
}

main() {
    info "Starting POTA Park Apply deployment..."
    echo ""
    
    check_docker
    check_config
    create_directories
    set_permissions
    deploy
    show_status
}

main "$@"
