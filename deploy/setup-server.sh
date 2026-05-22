#!/bin/bash
# TIFO Server Deployment Script
# Deploys Indexer + Correspondent + PostgreSQL on Ubuntu/Debian
# Usage: ssh root@<server-ip> 'bash -s' < deploy/setup-server.sh

set -euo pipefail

echo "========================================="
echo "  TIFO Server Setup"
echo "  Indexer + Correspondent + PostgreSQL"
echo "========================================="

# ── 1. System dependencies ──────────────────────────────────────
echo "[1/7] Installing system dependencies..."
apt-get update -qq
apt-get install -y -qq curl git postgresql postgresql-client nginx

# Install Node.js 20.x
if ! command -v node &> /dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y -qq nodejs
fi

echo "  Node $(node --version)"
echo "  npm $(npm --version)"

# ── 2. PostgreSQL setup ─────────────────────────────────────────
echo "[2/7] Configuring PostgreSQL..."
systemctl enable postgresql
systemctl start postgresql

# Create user and database (idempotent)
sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='tifo'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE USER tifo WITH PASSWORD 'tifo';"
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='tifo'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE DATABASE tifo OWNER tifo;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE tifo TO tifo;"

# Allow local password auth
PG_HBA=$(sudo -u postgres psql -t -c "SHOW hba_file" | tr -d '[:space:]')
if ! grep -q "tifo" "$PG_HBA" 2>/dev/null; then
  echo "local   tifo   tifo   md5" >> "$PG_HBA"
  echo "host    tifo   tifo   127.0.0.1/32   md5" >> "$PG_HBA"
  systemctl reload postgresql
fi

echo "  PostgreSQL ready."

# ── 3. Clone / update repository ────────────────────────────────
echo "[3/7] Setting up application code..."
APP_DIR="/opt/tifo"
if [ -d "$APP_DIR/.git" ]; then
  cd "$APP_DIR" && git pull origin main
else
  git clone https://github.com/wangyangmingsss/tifo.git "$APP_DIR"
fi
cd "$APP_DIR"

# ── 4. Build Indexer ────────────────────────────────────────────
echo "[4/7] Building Indexer..."
cd "$APP_DIR/apps/indexer"
npm ci --production=false
npm run build

# Create .env if not exists
if [ ! -f .env ]; then
  cp .env.example .env
  echo "  ⚠ Created .env from example — review settings!"
fi

# Initialize database schema
PGPASSWORD=tifo psql -h localhost -U tifo -d tifo -f src/db/schema.sql

# ── 5. Build Correspondent ──────────────────────────────────────
echo "[5/7] Building Correspondent..."
cd "$APP_DIR/apps/correspondent"
npm ci --production=false
npm run build

if [ ! -f .env ]; then
  cp .env.example .env
  echo "  ⚠ Created .env from example — review settings!"
fi

# ── 6. Systemd services ─────────────────────────────────────────
echo "[6/7] Installing systemd services..."

cat > /etc/systemd/system/tifo-indexer.service << 'EOF'
[Unit]
Description=TIFO Indexer — X Layer Event Indexer + REST API
After=network.target postgresql.service
Requires=postgresql.service

[Service]
Type=simple
User=root
WorkingDirectory=/opt/tifo/apps/indexer
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

cat > /etc/systemd/system/tifo-correspondent.service << 'EOF'
[Unit]
Description=TIFO War Correspondent — On-chain events to Twitter
After=network.target
Wants=tifo-indexer.service

[Service]
Type=simple
User=root
WorkingDirectory=/opt/tifo/apps/correspondent
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable tifo-indexer tifo-correspondent
systemctl restart tifo-indexer
systemctl restart tifo-correspondent

echo "  Services installed and started."

# ── 7. Nginx reverse proxy ──────────────────────────────────────
echo "[7/7] Configuring Nginx reverse proxy..."

cat > /etc/nginx/sites-available/tifo-api << 'NGINXEOF'
server {
    listen 80;
    server_name _;

    # Indexer REST API
    location /api/ {
        proxy_pass http://127.0.0.1:4000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # CORS headers
        add_header Access-Control-Allow-Origin * always;
        add_header Access-Control-Allow-Methods 'GET, OPTIONS' always;
        add_header Access-Control-Allow-Headers 'Content-Type' always;

        if ($request_method = OPTIONS) {
            return 204;
        }
    }

    # Health check at root
    location /healthz {
        proxy_pass http://127.0.0.1:4000/healthz;
    }

    location / {
        return 200 '{"service":"TIFO API Gateway","status":"ok","endpoints":["/api/healthz","/api/map/state","/api/leaderboard","/api/faction/:id","/api/region/:id/history","/api/stats"]}';
        add_header Content-Type application/json;
    }
}
NGINXEOF

ln -sf /etc/nginx/sites-available/tifo-api /etc/nginx/sites-enabled/tifo-api
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

echo ""
echo "========================================="
echo "  TIFO Server Setup Complete!"
echo "========================================="
echo ""
echo "Services:"
echo "  tifo-indexer:        systemctl status tifo-indexer"
echo "  tifo-correspondent:  systemctl status tifo-correspondent"
echo ""
echo "API Endpoints:"
echo "  http://<server-ip>/api/healthz"
echo "  http://<server-ip>/api/map/state"
echo "  http://<server-ip>/api/leaderboard"
echo "  http://<server-ip>/api/stats"
echo "  http://<server-ip>/api/faction/:id"
echo "  http://<server-ip>/api/region/:id/history"
echo ""
echo "Logs:"
echo "  journalctl -u tifo-indexer -f"
echo "  journalctl -u tifo-correspondent -f"
echo ""
