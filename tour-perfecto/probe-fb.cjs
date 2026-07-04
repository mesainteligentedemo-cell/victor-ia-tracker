const { chromium } = require('playwright');
const path=require('path');
(async () => {
  const ctx = await chromium.launchPersistentContext(path.join(__dirname,'chrome-profile-fb'), { headless:true, viewport:{width:1400,height:900}, serviceWorkers:'block' });
  const page = ctx.pages()[0]||await ctx.newPage();
  const warns=[];
  page.on('console', m=>{ const t=m.text(); if(/VIA|firebase|firestore|error|permission/i.test(t)) warns.push(m.type()+': '+t.slice(0,180)); });
  await page.addInitScript(()=>{ try{localStorage.setItem('via_access_authenticated','true');localStorage.setItem('via_access_role','admin');}catch(e){} });
  await page.goto('https://tracker.victor-ia.xyz',{waitUntil:'networkidle',timeout:60000}).catch(()=>{});
  await page.waitForTimeout(6000);
  const s = await page.evaluate(async ()=>{
    const o={ hasFirebase: typeof firebase!=='undefined', hasFirestoreFn:false, appsLen:null, initErr:null, ready:null, syncErr:null };
    try{ o.hasFirestoreFn = !!(firebase && firebase.firestore); }catch(e){ o.initErr='fs-check:'+e.message; }
    try{ o.appsLen = firebase.apps.length; }catch(e){}
    try{ if(typeof viaInitFirebase==='function') viaInitFirebase(); }catch(e){ o.initErr='viaInit:'+e.message; }
    await new Promise(r=>setTimeout(r,1500));
    try{ o.ready = window.VIA_FIREBASE && VIA_FIREBASE.ready; }catch(e){}
    // intento de escritura directa para ver si las reglas permiten
    try{
      const db=firebase.firestore();
      await db.collection('tracker').doc('__probe__').set({data:'x',t:Date.now()},{merge:true});
      o.syncErr='OK-write';
    }catch(e){ o.syncErr=e.code+': '+e.message.slice(0,120); }
    return o;
  });
  console.log(JSON.stringify(s,null,2));
  console.log('CONSOLE:', warns.slice(0,8).join(' | '));
  await ctx.close();
})();
