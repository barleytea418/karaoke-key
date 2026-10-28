// 画面の通しテスト。server.py を起動し、フェイクマイクに既知の音を流して測定精度も確かめる
const {chromium}=require('playwright'),{spawn,execFileSync}=require('child_process'),path=require('path'),os=require('os'),fs=require('fs');
const ROOT=path.join(__dirname,'..'),URL='http://127.0.0.1:8790/',LIVE=!!process.env.LIVE;
const fail=[];const ok=(c,msg)=>{console.log((c?'✔ ':'✖ ')+msg);if(!c)fail.push(msg)};
(async()=>{
  const srv=spawn('python3',['server.py'],{cwd:ROOT,stdio:'ignore'});
  for(let i=0;i<50;i++){try{await fetch(URL);break}catch{await new Promise(r=>setTimeout(r,100))}}
  const wav=path.join(os.tmpdir(),'karaoke_220.wav');execFileSync('python3',[path.join(__dirname,'make_tone.py'),'220',wav]);
  const b=await chromium.launch({channel:'chrome',args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream','--use-file-for-fake-audio-capture='+wav]});
  try{
    const c=await b.newContext();await c.grantPermissions(['microphone']);const p=await c.newPage();
    const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>m.type()==='error'&&!m.text().includes('502')&&errs.push(m.text()));
    await p.goto(URL);
    ok(!(await p.content()).includes('undefined'),'音名に undefined が出ない');
    ok(await p.textContent('#key')!=='—','初期表示でおすすめキーが出る');
    // 220Hz=mid2A(57)を地声最高として測る
    await p.locator('#steps .step').nth(1).locator('button').click();
    await p.waitForFunction(()=>/記録しました|拾えません/.test(document.getElementById('status').textContent),null,{timeout:8000});
    const v=+await p.inputValue('#me_chestHigh');ok(v===57,`フェイクマイク220Hzを mid2A(57) と測定 → ${v}`);
    // 手入力→保存→再読み込みで残る
    await p.fill('#title','テスト曲');await p.selectOption('#songLow','50');await p.selectOption('#songHigh','70');
    await p.click('#addSong');await p.reload();
    ok((await p.textContent('#mylist')).includes('テスト曲'),'マイリストが再読み込み後も残る');
    ok(+await p.inputValue('#me_chestHigh')===57,'測定値が再読み込み後も残る');
    // 曲検索(API)
    await p.route('**/api/search*',r=>LIVE?r.continue():r.fulfill({json:[{title:'うっせぇわ/Ado',low:'mid1G#',high:'hiD#',url:'https://example.com',source:'Hisatono(DAMで確認)'}]}));
    await p.fill('#q','うっせぇわ');await p.click('#sform button');
    await p.locator('#results button').first().click({timeout:20000});
    ok((await p.inputValue('#title')).includes('うっせぇわ'),'検索結果を選ぶと曲名が入る');
    ok(+await p.inputValue('#songHigh')===75,'検索結果の最高音 hiD# が入る');
    await p.route('**/api/search*',r=>r.fulfill({status:502,json:{error:'x'}}));
    await p.fill('#q','落ちる');await p.click('#sform button');
    await p.waitForFunction(()=>/検索できません/.test(document.getElementById('sstatus').textContent));ok(true,'API失敗時に案内が出る');
    // スマホ幅で横スクロールしない
    await p.setViewportSize({width:375,height:800});
    ok(await p.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'375px幅で横スクロールが出ない');
    ok(errs.length===0,'コンソールエラーなし '+errs.join(' / '));
  }finally{await b.close()}
  // 低い男声〜高い女声の裏声まで、測定が半音ずれないか
  for(const [hz,midi] of [[98,43],[147,50],[392,67],[659,76],[880,81]]){
    const f=path.join(os.tmpdir(),`karaoke_${hz}.wav`);execFileSync('python3',[path.join(__dirname,'make_tone.py'),String(hz),f]);
    const bb=await chromium.launch({channel:'chrome',args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream','--use-file-for-fake-audio-capture='+f]});
    try{const pp=await bb.newPage();await pp.goto(URL);await pp.locator('#steps .step').nth(0).locator('button').click();
      await pp.waitForFunction(()=>/記録しました|拾えません/.test(document.getElementById('status').textContent),null,{timeout:8000});
      const v=+await pp.inputValue('#me_chestLow');ok(v===midi,`${hz}Hz → 期待${midi} 測定${v}`)}finally{await bb.close()}
  }
  srv.kill()
  if(fail.length){console.log(`\n失敗 ${fail.length}件`);process.exit(1)}console.log('\nE2E OK');
})().catch(e=>{console.error(e);process.exit(1)});
