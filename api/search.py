"""曲音域検索API(hisatono.com＋keytube.net)。Vercelでは /api/search、ローカルでは server.py から使う。"""
import concurrent.futures, html, json, re, urllib.parse, urllib.request
from functools import lru_cache
from http.server import BaseHTTPRequestHandler

UA = {"User-Agent": "Mozilla/5.0 (karaoke-key-local)"}
CARD_RE = re.compile(r'<a href="(https://hisatono\.com/tono/[^"]+)"[^>]*class="entry-card-wrap')
RANGE_RE = re.compile(r'最低音\s*[：:]?\s*([a-zA-Z0-9#＃]+).{0,80}?最高音\s*[：:]?\s*([a-zA-Z0-9#＃]+)', re.S)
TITLE_RE = re.compile(r'<h1[^>]*>(.*?)</h1>', re.S)

def get(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=15) as r:
        return r.read().decode("utf-8", "replace")

@lru_cache(maxsize=512)
def article(url):
    h = get(url)
    m = RANGE_RE.search(re.sub(r"<[^>]+>", " ", h))
    if not m:
        return None
    t = TITLE_RE.search(h)
    title = html.unescape(re.sub(r"<[^>]+>", "", t.group(1))).strip() if t else url
    title = re.sub(r"のカラオケ.*$", "", title)  # 「曲/歌手のカラオケ音域と…」→「曲/歌手」
    norm = lambda s: s.replace("＃", "#")
    return {"title": title, "low": norm(m.group(1)), "high": norm(m.group(2)), "url": url}

KT_ROW_RE = re.compile(r'<article\s+class="song-row".*?</article>', re.S)

@lru_cache(maxsize=256)
def search_keytube(q):
    """KeyTube(約8万曲・自動解析)。検索結果ページに音域が載っているので1回で取れる"""
    h = get("https://keytube.net/search/?t=word&word=" + urllib.parse.quote(q))
    out = []
    for row in KT_ROW_RE.findall(h)[:20]:
        sid = re.search(r'data-song-id="(\d+)"', row)
        t = re.search(r'song-row__title[^>]*><a[^>]*>(.*?)</a>', row, re.S)
        ar = re.search(r'song-row__artist[^>]*><a[^>]*>(.*?)</a>', row, re.S)
        lo = re.search(r'scale-value--low"[^>]*>([^<]+)<', row)
        hi = re.search(r'scale-value--high"[^>]*>([^<]+)<', row)
        if not (sid and t and lo and hi):
            continue
        name = html.unescape(t.group(1)).strip() + ("/" + html.unescape(ar.group(1)).strip() if ar else "")
        out.append({"title": name, "low": lo.group(1).strip(), "high": hi.group(1).strip(),
                    "url": f"https://keytube.net/song/detail/{sid.group(1)}", "source": "KeyTube(自動解析)"})
    return out

@lru_cache(maxsize=128)
def search_hisatono(q):
    h = get("https://hisatono.com/tono/?s=" + urllib.parse.quote(q))
    urls = list(dict.fromkeys(CARD_RE.findall(h)))[:10]
    with concurrent.futures.ThreadPoolExecutor(5) as ex:
        found = [a for a in ex.map(article, urls) if a]
    for a in found:
        a["source"] = "Hisatono(DAMで確認)"
    return list({a["title"]: a for a in reversed(found)}.values())[::-1]  # 同じ曲の重複記事をまとめる

def search(q):
    """人が確認したHisatonoを先に、足りない分をKeyTubeで補う。片方が落ちても、もう片方は返す"""
    with concurrent.futures.ThreadPoolExecutor(2) as ex:
        fs = [ex.submit(search_hisatono, q), ex.submit(search_keytube, q)]
        res = []
        for f in fs:
            try:
                res += f.result()
            except Exception:
                pass
    seen, out = set(), []
    for a in res:
        k = re.sub(r"\s", "", a["title"]).lower()
        if k not in seen:
            seen.add(k); out.append(a)
    return out


class handler(BaseHTTPRequestHandler):
    """Vercelのサーバーレス関数の入口"""
    def do_GET(self):
        q = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query).get("q", [""])[0].strip()[:100]
        try:
            body, code = json.dumps(search(q) if q else [], ensure_ascii=False), 200
        except Exception as e:
            body, code = json.dumps({"error": str(e)}, ensure_ascii=False), 502
        b = body.encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "s-maxage=86400")  # 同じ検索は1日キャッシュして相手サイトへの負荷を減らす
        self.end_headers()
        self.wfile.write(b)
