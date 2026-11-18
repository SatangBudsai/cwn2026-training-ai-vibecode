#!/bin/sh
# รันใน container ของ Gitea ในนาม user git: สร้างผู้ดูแลระบบ (ครั้งเดียว)
set -e
if gitea admin user list --admin | grep -qw "$ADMIN_USER"; then
  echo "admin $ADMIN_USER มีอยู่แล้ว"
else
  gitea admin user create --admin --username "$ADMIN_USER" --password "$ADMIN_PASSWORD" \
    --email "$ADMIN_USER@novatech.test" --must-change-password=false
fi
