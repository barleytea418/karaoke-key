# カラオケキー提案

マイクで自分の音域をはかり、曲の音域からカラオケで歌いやすいキーを提案するWebアプリ。

- 画面：`index.html`(計算は `logic.js`)
- 曲検索API：`api/search.py`(Hisatono・KeyTubeから音域を取得。Vercelのサーバーレス関数)
- ローカル確認：`python3 server.py` → http://localhost:8790/
- 検証(門)：`sh check.sh` で「OK」が出れば合格。`LIVE=1 sh check.sh` で実サイト検索も確認
- 公開：Vercel(`npx vercel --prod`)
