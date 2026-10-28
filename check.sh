#!/bin/sh
# 1コマンドの門：全部通れば「OK」。LIVE=1 sh check.sh で実サイト検索も確かめる
set -e
cd "$(dirname "$0")"
node --test tests/*.test.js
python3 -m unittest tests/test_search.py
node tests/e2e.js
echo "OK"
