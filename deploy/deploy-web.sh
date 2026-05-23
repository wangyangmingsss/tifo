#!/bin/bash
# ============================================================
#  TIFO 前端一键部署脚本
#  在已部署 Indexer 的服务器上运行
#  用法: bash /tmp/deploy-web.sh
# ============================================================

set -euo pipefail

echo "========================================="
echo "  TIFO 前端部署"
echo "  Next.js 14 + Nginx"
echo "========================================="

APP_DIR="/opt/tifo"
WEB_DIR="$APP_DIR/apps/web"
cd "$APP_DIR"

# ── 1. 拉取最新代码 ──────────────────────────────────────────
echo ""
echo "[1/6] 拉取最新代码..."
git pull origin main || true

# ── 2. 写入前端环境变量 ──────────────────────────────────────
echo ""
echo "[2/6] 配置环境变量..."
cat > "$WEB_DIR/.env.local" << 'EOF'
NEXT_PUBLIC_INDEXER_API=http://76.13.189.224/api
EOF
echo "  .env.local 已写入"

# ── 3. 安装前端依赖 ──────────────────────────────────────────
echo ""
echo "[3/6] 安装依赖..."
cd "$WEB_DIR"
npm install --legacy-peer-deps 2>&1 | tail -5
echo "  依赖安装完成"

# ── 4. 构建 Next.js ──────────────────────────────────────────
echo ""
echo "[4/6] 构建 Next.js (可能需要几分钟)..."
npm run build
echo "  构建完成"

# ── 5. 创建 systemd 服务 ─────────────────────────────────────
echo ""
echo "[5/6] 配置 systemd 服务..."

cat > /etc/systemd/system/tifo-web.service << 'EOF'
[Unit]
Description=TIFO Frontend — Next.js
After=network.target tifo-indexer.service

[Service]
Type=simple
User=root
WorkingDirectory=/opt/tifo/apps/web
ExecStart=/usr/bin/node node_modules/.bin/next start -p 3001
Restart=always
RestartSec=5
Environment=NODE_ENV=production
Environment=NEXT_PUBLIC_INDEXER_API=http://76.13.189.224/api

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable tifo-web
systemctl restart tifo-web
sleep 3
echo "  前端服务已启动"

# ── 6. 更新 Nginx ────────────────────────────────────────────
echo ""
echo "[6/6] 更新 Nginx 配置..."

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
        add_header Access-Control-Allow-Origin * always;
        add_header Access-Control-Allow-Methods 'GET, POST, OPTIONS' always;
        add_header Access-Control-Allow-Headers 'Content-Type, Authorization' always;
        if ($request_method = OPTIONS) { return 204; }
    }

    # Health check
    location /healthz {
        proxy_pass http://127.0.0.1:4000/healthz;
    }

    # Next.js frontend
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
    }
}
NGINXEOF

nginx -t && systemctl reload nginx

echo ""
echo "========================================="
echo "  TIFO 前端部署完成!"
echo "========================================="
echo ""
echo "  网站地址: http://76.13.189.224"
echo "  API 地址: http://76.13.189.224/api"
echo ""
echo "  管理命令:"
echo "    systemctl status tifo-web"
echo "    journalctl -u tifo-web -f"
echo "    systemctl restart tifo-web"
echo "========================================="
