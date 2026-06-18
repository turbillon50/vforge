#!/bin/bash
source /root/.nvm/nvm.sh
nvm use 20 >/dev/null
cd /root/vforge
export NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=""
export CLERK_SECRET_KEY=""
export VFORGE_PREVIEW="1"
export PORT=8099
exec npx next start -p 8099 -H 0.0.0.0
