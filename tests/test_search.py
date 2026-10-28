"""検索APIのテスト。fixtureで解析を確かめ、LIVE=1なら本物のサイトにも1回だけ問い合わせる"""
import json, os, sys, unittest
from pathlib import Path
from unittest import mock
sys.path.insert(0, str(Path(__file__).parent.parent / "api"))
import search  # noqa: E402

KT = '''<article class="song-row" data-song-id="53"><div class="song-row__title"><a href="#">マリーゴールド</a></div>
<div class="song-row__artist"><a href="#">あいみょん</a></div><span class="scale-value--low">mid1F</span><span class="scale-value--high">hiB</span></article>'''

class T(unittest.TestCase):
    def setUp(self):
        search.search_keytube.cache_clear(); search.search_hisatono.cache_clear()
    def test_keytube_parse(self):
        with mock.patch.object(search, "get", return_value=KT):
            r = search.search_keytube("x")
        self.assertEqual(r[0]["title"], "マリーゴールド/あいみょん"); self.assertEqual((r[0]["low"], r[0]["high"]), ("mid1F", "hiB"))
    def test_one_site_down(self):
        def get(u):
            if "hisatono" in u: raise OSError("down")
            return KT
        with mock.patch.object(search, "get", side_effect=get):
            self.assertEqual(len(search.search("x")), 1)
    @unittest.skipUnless(os.environ.get("LIVE"), "LIVE=1で実サイト確認")
    def test_live(self):
        r = search.search("うっせぇわ")
        self.assertTrue(any("うっせぇわ" in a["title"] for a in r), json.dumps(r, ensure_ascii=False)[:300])

if __name__ == "__main__":
    unittest.main()
