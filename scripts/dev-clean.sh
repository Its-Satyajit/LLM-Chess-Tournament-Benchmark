#!/usr/bin/env bash

set -e

pkill -TERM -f "server.ts" 2>/dev/null || true

sleep 0.5

exec nub server.ts
