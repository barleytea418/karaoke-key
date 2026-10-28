// 音名とキー提案の計算(画面に依存しない部分。index.htmlとテストの両方から使う)
// DAM表記：Aで区切りが変わる。hiA=A4(440Hz)
const OCT=['lowlow','low','mid1','mid2','hi','hihi','hihihi'], NN=['A','A#','B','C','C#','D','D#','E','F','F#','G','G#'];
const dam=m=>{const d=m-21;return OCT[Math.floor(d/12)]+NN[d%12]};
const toMidi=n=>{const m=/^(lowlow|low|mid1|mid2|hihihi|hihi|hi)([A-G][#＃]?)$/i.exec(String(n).trim());if(!m)return null;
  const o=OCT.indexOf(m[1].toLowerCase()),i=NN.indexOf(m[2].toUpperCase().replace('＃','#'));return o<0||i<0?null:21+o*12+i};
const keyText=k=>(k>0?'+':k<0?'':'±')+k;

// me={chestLow,chestHigh,falLow,falHigh} song={low,high}(MIDI) opt={fal,margin,oct:'auto'|0|-12|12}
// 返り値 {oct,all:[{k,over,under}],best}。はみ出しが少なく、原曲(0)に近いキーを選ぶ
function recommend(me,song,opt){
  const top=(opt.fal?Math.max(me.chestHigh,me.falHigh):me.chestHigh)-opt.margin,low=me.chestLow;
  const sc=c=>(c.over+c.under)*100+Math.abs(c.k);
  const tryOct=o=>{const all=[];for(let k=-7;k<=7;k++)all.push({k,over:Math.max(0,song.high+o+k-top),under:Math.max(0,low-(song.low+o+k))});
    return{oct:o,all,best:all.reduce((a,c)=>sc(c)<sc(a)?c:a)}};
  if(opt.oct!=='auto')return tryOct(+opt.oct);
  // 自動：原曲で収まればそれ。だめならオク下・オク上で、はみ出しが少ない方(同じなら原曲に近い方)
  const c=[0,-12,12].map(tryOct);
  if(sc(c[0].best)<100)return c[0];
  return c.slice().sort((a,b)=>sc(a.best)-sc(b.best)||Math.abs(a.oct)-Math.abs(b.oct))[0];
}

// 測定中のピッチ列から、いちばん長く出ていた半音を返す(足りなければnull)
function stableNote(hist){
  if(hist.length<10)return null;
  const cnt={};hist.forEach(p=>{const m=Math.round(p);cnt[m]=(cnt[m]||0)+1});
  return +Object.entries(cnt).sort((a,b)=>b[1]-a[1])[0][0];
}

if(typeof module!=='undefined')module.exports={OCT,NN,dam,toMidi,keyText,recommend,stableNote};
