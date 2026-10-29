#!/bin/sh
# 1コマンドの門：全部通れば「OK」。LIVE=1 sh check.sh で実サイト検索も確かめる
set -e
cd "$(dirname "$0")"
[ -z "$PW_CHROME" ] && PW_CHROME=$(ls -d ~/Library/Caches/ms-playwright/chromium_headless_shell-*/chrome-headless-shell-mac-arm64/chrome-headless-shell 2>/dev/null | tail -1); export PW_CHROME
node --test tests/*.test.js
python3 -m unittest tests/test_search.py
node tests/e2e.js
echo "OK"
