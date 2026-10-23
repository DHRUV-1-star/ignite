const CATS=[
{k:'int',n:'Interior & Furniture',min:5,type:'d',hint:'+demand per step above min'},
{k:'kit',n:'Kitchen & Equipment',min:6,type:'c',hint:'+capacity per step above min'},
{k:'mkt',n:'Marketing & Promotion',min:1,type:'d',hint:'+demand per step above min'},
{k:'stf',n:'Staff Training & Setup',min:2,type:'d',hint:'+demand per step above min'},
{k:'loc',n:'Location & Store Setup',min:5,type:'d',hint:'+demand per step above min'},
{k:'res',n:'Working Capital Reserve',min:3,type:'n',hint:'resilience only, no demand effect'}];
const DEF=()=>({bill:200,vc:80,fixed:240000,demand:80,cap:80,days:30,hours:8,
 co:{int:{step:2,gain:2},kit:{step:2,gain:10},mkt:{step:1,gain:4},stf:{step:1,gain:2},loc:{step:2,gain:3},res:{step:1,gain:0}},
 dist:[8,10,12,17,19,16,11,7]});
let cfg=DEF(),pin='1234',orgOK=false;
const EVENTS=[
{id:'comp',n:'Competitor opening nearby',d:'Demand −15%',f:(s)=>{s.dm*=0.85}},
{id:'viral',n:'Viral social media promotion',d:'Demand +20 customers/day',f:(s)=>{s.da+=20}},
{id:'raw',n:'Raw material price increase',d:'Variable cost +₹10/customer',f:(s)=>{s.vc+=10}},
{id:'brk',n:'Unexpected equipment breakdown',d:'Kitchen capacity −20 customers/day',f:(s)=>{s.ca-=20}},
{id:'fest',n:'Festival footfall increase',d:'Demand +25%',f:(s)=>{s.dm*=1.25}}];
let evOn={};
const fmt=n=>'₹'+Math.round(n).toLocaleString('en-IN');
const fmtD=n=>'₹'+n.toLocaleString('en-IN',{maximumFractionDigits:2});

function panels(){
 document.getElementById('panels').innerHTML=['A','B'].map(p=>`<div class="card p${p.toLowerCase()}"><h2>Player ${p}</h2>
 ${CATS.map(c=>`<div class="row"><label>${c.n}<small>Min ₹${c.min}L · ${c.hint}</small></label>
 <input type="number" step="1" min="${c.min}" id="${p}_${c.k}" value="${c.min}" oninput="tot('${p}')"> <span class="sub">L</span></div>`).join('')}
 <div class="tot" id="t${p}"></div><div class="err" id="e${p}"></div></div>`).join('');
 tot('A');tot('B');
}
function vals(p){const o={};CATS.forEach(c=>o[c.k]=document.getElementById(p+'_'+c.k).value);return o}
function validate(p){
 const v=vals(p),errs=[];let s=0;
 CATS.forEach(c=>{const el=document.getElementById(p+'_'+c.k);const raw=v[c.k];const n=Number(raw);let bad=false;
  if(raw===''||!Number.isInteger(n)){errs.push(c.n+': whole-number lakh required');bad=true}
  else if(n<c.min){errs.push(`${c.n}: minimum ₹${c.min}L`);bad=true}
  el.classList.toggle('bad',bad);s+=Number.isFinite(n)?n:0});
 if(s!==50)errs.push(`Total must be exactly ₹50L (now ₹${s}L)`);
 return{v:Object.fromEntries(CATS.map(c=>[c.k,Number(v[c.k])])),errs,s}}
function tot(p){const r=validate(p);const t=document.getElementById('t'+p);
 t.innerHTML=`Total: ₹${r.s}L / ₹50L · <span class="${r.s===50?'ok':'er'}">${r.s===50?'✓ balanced':(r.s<50?'₹'+(50-r.s)+'L unallocated':'₹'+(r.s-50)+'L over')}</span>`;
 document.getElementById('e'+p).textContent=r.errs.filter(e=>!e.startsWith('Total')).join(' · ')}
function loadEx(){const e={int:9,kit:9,mkt:6,stf:5,loc:11,res:10};CATS.forEach(c=>document.getElementById('A_'+c.k).value=e[c.k]);tot('A')}

function active(){return document.getElementById('adv').checked?EVENTS.filter(e=>evOn[e.id]):[]}
function calc(v,shock){
 const st={dm:1,da:0,ca:0,vc:0};active().forEach(e=>e.f(st));if(shock){st.dm*=0.8;st.vc+=10}
 let dem=cfg.demand,cap=cfg.cap,waste=0;
 CATS.forEach(c=>{const co=cfg.co[c.k];const inc=Math.floor((v[c.k]-c.min)/co.step);if(c.type!=='n')waste+=(v[c.k]-c.min)%co.step;
  if(c.type==='d')dem+=inc*co.gain;else if(c.type==='c')cap+=inc*co.gain});
 dem=Math.max(0,Math.round(dem*st.dm+st.da));cap=Math.max(0,cap+st.ca);
 const vc=cfg.vc+st.vc,served=Math.min(dem,cap),contrib=cfg.bill-vc;
 const sum=cfg.dist.reduce((a,b)=>a+b,0)||1;
 const raw=cfg.dist.map(x=>served*x/sum),fl=raw.map(Math.floor);let rem=served-fl.reduce((a,b)=>a+b,0);
 raw.map((r,i)=>[r-fl[i],i]).sort((a,b)=>b[0]-a[0]||a[1]-b[1]).slice(0,rem).forEach(([,i])=>fl[i]++);
 const dfix=cfg.fixed/cfg.days,hfix=dfix/cfg.dist.length;let cum=0;
 const hrs=fl.map((c,i)=>{const rev=c*cfg.bill,ve=c*vc,pr=rev-ve-hfix;cum+=pr;return{h:i+1,c,rev,ve,fx:hfix,pr,cum}});
 const dRev=served*cfg.bill,dVar=served*vc,dProf=dRev-dVar-dfix;
 let be=null;if(contrib>0){be=Math.floor(cfg.fixed/(cfg.days*contrib))+1}
 return{waste,dem,cap,vc,served,unserved:Math.max(0,dem-served),hrs,dRev,dVar,dfix,dProf,mProf:dProf*cfg.days,mRev:dRev*cfg.days,mExp:(dVar+dfix)*cfg.days,be,res:v.res}}

let R=null,timer=null;
function run(){
 const a=validate('A'),b=validate('B');tot('A');tot('B');
 ['A','B'].forEach((p,i)=>document.getElementById('e'+p).textContent=[a,b][i].errs.join(' · '));
 if(a.errs.length||b.errs.length){document.getElementById('out').innerHTML='';return}
 R={A:calc(a.v),B:calc(b.v)};R.A.stress=calc(a.v,true).mProf;R.B.stress=calc(b.v,true).mProf;clearInterval(timer);let h=0;
 draw(0);timer=setInterval(()=>{h++;draw(h);if(h>=cfg.dist.length)clearInterval(timer)},700)}

function chart(h){
 const W=640,H=240,P=42,n=cfg.dist.length;
 const all=[...R.A.hrs,...R.B.hrs].map(x=>x.cum).concat([0]);
 let mn=Math.min(...all),mx=Math.max(...all);if(mx===mn){mx=mn+1}
 const X=i=>P+(W-P-12)*(i/(n-1||1)),Y=v=>H-24-(H-44)*((v-mn)/(mx-mn));
 const line=(r,col)=>{const pts=r.hrs.slice(0,h).map((x,i)=>X(i)+','+Y(x.cum)).join(' ');
  return `<polyline fill="none" stroke="${col}" stroke-width="3" points="${pts}"/>`+r.hrs.slice(0,h).map((x,i)=>`<circle cx="${X(i)}" cy="${Y(x.cum)}" r="3.5" fill="${col}"/>`).join('')};
 let g='';for(let i=0;i<=4;i++){const v=mn+(mx-mn)*i/4;g+=`<line x1="${P}" x2="${W-8}" y1="${Y(v)}" y2="${Y(v)}" stroke="#252b3f"/><text x="${P-4}" y="${Y(v)+4}" fill="#8e96b3" font-size="10" text-anchor="end">${Math.round(v/1000)}k</text>`}
 for(let i=0;i<n;i++)g+=`<text x="${X(i)}" y="${H-6}" fill="#8e96b3" font-size="10" text-anchor="middle">H${i+1}</text>`;
 g+=`<line x1="${P}" x2="${W-8}" y1="${Y(0)}" y2="${Y(0)}" stroke="#8e96b3" stroke-dasharray="4"/>`;
 return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Cumulative daily profit by hour">${g}${line(R.A,'#ff7a1a')}${line(R.B,'#2ec4b6')}</svg>`}

function cmpBars(title,ka,kb,sa,sb){
 const a=ka,b=kb,m=Math.max(Math.abs(a),Math.abs(b),1);
 return `<div class="cmp"><div class="lbl">${title}</div>
 <div class="cb" style="width:${Math.abs(a)/m*100}%;background:#ff7a1a"></div><div class="sub">A: ${sa}</div>
 <div class="cb" style="width:${Math.abs(b)/m*100}%;background:#2ec4b6"></div><div class="sub">B: ${sb}</div></div>`}

function kp(r){return `<div class="kpis">
 <div class="k"><b>${r.dem}</b><span>Potential demand/day</span></div><div class="k"><b>${r.cap}</b><span>Kitchen capacity/day</span></div>
 <div class="k"><b>${r.served}</b><span>Customers served/day</span></div><div class="k"><b>${r.unserved}</b><span>Unserved demand/day</span></div>
 <div class="k"><b>${fmt(r.dRev)}</b><span>Daily revenue</span></div><div class="k"><b>${fmt(r.dProf)}</b><span>Daily operating profit</span></div>
 <div class="k"><b class="${r.mProf>=0?'ok':'er'}">${fmt(r.mProf)}</b><span>Monthly operating profit</span></div>
 <div class="k"><b>${r.be===null?'N/A':r.be}</b><span>Break-even customers/day (min for profit)</span></div><div class="k"><b>${fmt(r.stress)}</b><span>Stress-test monthly profit (tiebreak)</span></div><div class="k"><b>${r.mProf>0?(5000000/r.mProf).toFixed(1)+' mo':'N/A'}</b><span>Payback of ₹50L (info only)</span></div></div>`}

function draw(h){
 const n=cfg.dist.length,done=h>=n,A=R.A,B=R.B;
 let html=`<div class="tl">${Array.from({length:n},(_,i)=>`<div class="${i<h?'on':''}"></div>`).join('')}</div>
 <div class="sub">${done?'Day complete':'Simulating hour '+Math.max(h,1)+' of '+n+'…'}${active().length?'<span class="tag">Advanced mode: '+active().map(e=>e.n).join(', ')+'</span>':''}</div>`;
 html+=`<div class="card" style="margin-top:10px"><h2>Cumulative operating profit by hour <span class="sub">(<span style="color:#ff7a1a">● A</span> <span style="color:#2ec4b6">● B</span>)</span></h2>${chart(h)}</div>`;
 if(done){
  const d=A.mProf-B.mProf,D=decide(A,B);
  html+=`<div class="win">${D.w?'🏆 Player '+D.w+' wins'+(D.lv===0?' by '+fmt(Math.abs(d))+' per month':' on tiebreaker: '+CRIT[D.lv][0]):'🤝 Dead heat — both strategies are functionally identical'}<div class="sub" style="font-weight:400">Monthly operating profit: A ${fmt(A.mProf)} · B ${fmt(B.mProf)}</div></div>`;
  html+=`<div class="card" style="margin-top:14px"><h2>Scoring ladder <span class="sub">(first difference decides)</span></h2><div class="sc"><table><tr><th>Criterion</th><th>A</th><th>B</th><th></th></tr>${CRIT.map((c,i)=>`<tr><td>${c[0]}</td><td>${c[2](c[1](A))}</td><td>${c[2](c[1](B))}</td><td>${D.lv===i?'◀ decided':''}</td></tr>`).join('')}</table></div></div>`;
  html+=`<div class="grid"><div class="card pa"><h2>Player A</h2>${kp(A)}</div><div class="card pb"><h2>Player B</h2>${kp(B)}</div></div>`;
  html+=`<div class="card" style="margin-top:14px"><h2>Comparison (monthly)</h2>
  ${cmpBars('Revenue',A.mRev,B.mRev,fmt(A.mRev),fmt(B.mRev))}${cmpBars('Expenses (variable + fixed)',A.mExp,B.mExp,fmt(A.mExp),fmt(B.mExp))}${cmpBars('Operating profit',A.mProf,B.mProf,fmt(A.mProf),fmt(B.mProf))}</div>`;
  html+=['A','B'].map(p=>{const r=R[p];return `<div class="card p${p.toLowerCase()}" style="margin-top:14px"><h2>Player ${p} – hourly breakdown</h2><div class="sc"><table><tr><th>Hour</th><th>Cust.</th><th>Revenue</th><th>Variable</th><th>Fixed</th><th>Profit</th><th>Cumulative</th></tr>
  ${r.hrs.map(x=>`<tr><td>${x.h}</td><td>${x.c}</td><td>${fmtD(x.rev)}</td><td>${fmtD(x.ve)}</td><td>${fmtD(x.fx)}</td><td>${fmtD(x.pr)}</td><td>${fmtD(x.cum)}</td></tr>`).join('')}
  <tr><th>Total</th><th>${r.served}</th><th>${fmtD(r.dRev)}</th><th>${fmtD(r.dVar)}</th><th>${fmtD(r.dfix)}</th><th>${fmtD(r.dProf)}</th><th></th></tr></table></div>
  <div class="sub" style="margin-top:6px">Monthly = daily × ${cfg.days}. Reserve ₹${r.res}L (no direct demand effect).</div></div>`}).join('');
 }
 document.getElementById('out').innerHTML=html;
 document.getElementById('pbtn').classList.toggle('hid',!done)}

function renderEv(){
 const box=document.getElementById('evbox'),on=document.getElementById('adv').checked;
 box.classList.toggle('hid',!on);
 if(on)box.innerHTML=`<h2 style="margin:0 0 6px;font-size:16px">Market events <span class="tag">applied equally to both players · separate from default scoring</span></h2>`+
 EVENTS.map(e=>`<label class="ev"><input type="checkbox" ${evOn[e.id]?'checked':''} onchange="evOn['${e.id}']=this.checked"><span><b>${e.n}</b><br><span class="sub">${e.d}</span></span></label>`).join('')}

function openOrg(){
 const m=document.getElementById('modal');
 if(!orgOK){m.innerHTML=`<div class="modal"><div class="card"><h2>Organizer access</h2><p class="sub">Enter organizer PIN (default 1234).</p>
 <input type="password" id="pin" style="width:100%"><div class="err" id="pe"></div><div class="bar"><button onclick="chk()">Unlock</button><button class="g" onclick="cl()">Cancel</button></div></div></div>`;return}
 const co=cfg.co;
 m.innerHTML=`<div class="modal"><div class="card" style="max-height:90vh;overflow:auto"><h2>Organizer settings</h2>
 ${[['bill','Average bill (₹)'],['vc','Variable cost (₹/customer)'],['fixed','Monthly fixed expenses (₹)'],['demand','Initial daily demand'],['cap','Starting kitchen capacity']].map(([k,l])=>`<div class="row"><label>${l}</label><input type="number" id="o_${k}" value="${cfg[k]}"></div>`).join('')}
 <div class="sub" style="margin-top:8px">Impact coefficients (every <i>step</i> lakh above minimum adds <i>gain</i>)</div>
 ${CATS.filter(c=>c.type!=='n').map(c=>`<div class="row"><label>${c.n}</label><input type="number" id="s_${c.k}" value="${co[c.k].step}" style="width:60px" min="1"><input type="number" id="g_${c.k}" value="${co[c.k].gain}" style="width:60px"></div>`).join('')}
 <div class="sub" style="margin-top:8px">Hourly demand distribution (%, 8 values, normalised)</div>
 <input type="text" id="o_dist" style="width:100%" value="${cfg.dist.join(',')}">
 <div class="row"><label>New organizer PIN</label><input type="text" id="o_pin" placeholder="optional"></div>
 <div class="err" id="pe"></div>
 <div id="opt" class="sub" style="margin-top:8px"></div><div class="bar"><button onclick="saveOrg()">Save</button><button class="g" onclick="optim()">Find optimal</button><button class="g" onclick="cfg=DEF();cl()">Reset defaults</button><button class="g" onclick="orgOK=false;cl()">Lock & close</button></div></div></div>`}
function chk(){if(document.getElementById('pin').value===pin){orgOK=true;openOrg()}else document.getElementById('pe').textContent='Wrong PIN'}
function cl(){document.getElementById('modal').innerHTML=''}
function saveOrg(){
 const g=id=>Number(document.getElementById(id).value);
 const d=document.getElementById('o_dist').value.split(',').map(Number);
 if(d.some(x=>!isFinite(x)||x<0)||d.length<1||d.reduce((a,b)=>a+b,0)<=0){document.getElementById('pe').textContent='Invalid hourly distribution';return}
 ['bill','vc','fixed','demand','cap'].forEach(k=>cfg[k]=g('o_'+k));
 CATS.filter(c=>c.type!=='n').forEach(c=>{cfg.co[c.k]={step:Math.max(1,g('s_'+c.k)),gain:g('g_'+c.k)}});
 cfg.dist=d;const np=document.getElementById('o_pin').value.trim();if(np)pin=np;
 R=null;document.getElementById('out').innerHTML='';cl()}
const CRIT=[['Monthly operating profit',r=>r.mProf,fmt],['Stress-test profit (demand −20%, variable cost +₹10)',r=>r.stress,fmt],['Working capital reserve',r=>r.res,x=>'₹'+x+'L'],['Potential demand/day',r=>r.dem,x=>x],['Kitchen capacity/day',r=>r.cap,x=>x],['Wasted capital (lower wins)',r=>-r.waste,x=>'₹'+(-x)+'L']];
function decide(A,B){for(let i=0;i<CRIT.length;i++){const a=CRIT[i][1](A),b=CRIT[i][1](B);if(Math.abs(a-b)>1e-9)return{w:a>b?'A':'B',lv:i}}return{w:null,lv:-1}}
function lite(a){let dem=cfg.demand,cap=cfg.cap;CATS.forEach((c,i)=>{if(c.type==='n')return;const co=cfg.co[c.k],inc=Math.floor((a[i]-c.min)/co.step);if(c.type==='d')dem+=inc*co.gain;else cap+=inc*co.gain});return (Math.min(dem,cap)*(cfg.bill-cfg.vc)-cfg.fixed/cfg.days)*cfg.days}
function optim(){const o=document.getElementById('opt');o.textContent='Searching all valid allocations…';setTimeout(()=>{let best=-1e18,arr=null,cnt=0;const m=CATS.map(c=>c.min),ex=50-m.reduce((a,b)=>a+b,0);
for(let i=0;i<=ex;i++)for(let k=0;k<=ex-i;k++)for(let q=0;q<=ex-i-k;q++)for(let s=0;s<=ex-i-k-q;s++)for(let l=0;l<=ex-i-k-q-s;l++){const r=ex-i-k-q-s-l,a=[m[0]+i,m[1]+k,m[2]+q,m[3]+s,m[4]+l,m[5]+r],p=lite(a);if(p>best+1e-9){best=p;arr=a;cnt=1}else if(Math.abs(p-best)<=1e-9)cnt++}
o.innerHTML='Best possible monthly profit: <b>'+fmt(best)+'</b><br>Example: '+CATS.map((c,i)=>c.n.split(' ')[0]+' ₹'+arr[i]+'L').join(', ')+'<br>'+cnt.toLocaleString('en-IN')+' allocations reach it, so the tiebreak ladder decides those.'},30)}
panels();
