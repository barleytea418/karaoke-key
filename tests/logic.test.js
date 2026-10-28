const test=require('node:test'),assert=require('node:assert');
const {dam,toMidi,keyText,recommend,stableNote}=require('../logic.js');
const me={chestLow:48,chestHigh:67,falLow:62,falHigh:76}; // mid1C〜mid2G
test('DAM表記とMIDIの往復',()=>{
  assert.equal(dam(69),'hiA');assert.equal(dam(60),'mid2C');assert.equal(dam(57),'mid2A');assert.equal(dam(56),'mid1G#');
  for(let m=33;m<=93;m++)assert.equal(toMidi(dam(m)),m);
  assert.equal(toMidi('hiD＃'),toMidi('hiD#'));assert.equal(toMidi(' mid2G '),67);assert.equal(toMidi('xyz'),null);assert.equal(toMidi(undefined),null);
});
test('キー表記',()=>{assert.equal(keyText(0),'±0');assert.equal(keyText(3),'+3');assert.equal(keyText(-2),'-2')});
test('収まる曲は原曲キー',()=>{const r=recommend(me,{low:50,high:63},{fal:false,margin:2,oct:'auto'});assert.equal(r.oct,0);assert.equal(r.best.k,0)});
test('高すぎる曲はキーを下げる(余裕2半音)',()=>{const r=recommend(me,{low:53,high:68},{fal:false,margin:2,oct:'auto'});
  assert.equal(r.oct,0);assert.equal(r.best.k,-3);assert.equal(r.best.over+r.best.under,0)});
test('裏声OKなら上限が上がる',()=>{const r=recommend(me,{low:53,high:72},{fal:true,margin:0,oct:'auto'});assert.equal(r.best.k,0)});
test('女性曲はオク下を選ぶ',()=>{const r=recommend(me,{low:60,high:79},{fal:false,margin:0,oct:'auto'});
  assert.equal(r.oct,-12);assert.equal(r.best.over+r.best.under,0)});
test('どうやっても無理な曲ははみ出し最小',()=>{const r=recommend(me,{low:40,high:80},{fal:false,margin:0,oct:0});
  assert.ok(r.best.over+r.best.under>0);assert.equal(r.all.length,15);
  const min=Math.min(...r.all.map(c=>c.over+c.under));assert.equal(r.best.over+r.best.under,min)});
test('オクターブ指定はそのまま',()=>{assert.equal(recommend(me,{low:50,high:60},{fal:false,margin:0,oct:12}).oct,12)});
test('安定音の抽出',()=>{assert.equal(stableNote([1,2]),null);
  assert.equal(stableNote([60.1,60.2,59.9,60,60.3,61,61.2,60,59.8,60,72]),60)});
