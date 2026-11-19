// Shared scanner UI for both stores. The page sets data-label and data-name.
var STORE_LABEL = 'Chevron';
(function () {
  var label = document.body.getAttribute('data-label') || 'Chevron';
  STORE_LABEL = label;
  var storeName = document.body.getAttribute('data-name') || 'Thomasville Chevron';
  document.title = storeName;
  var html = "\n\n<section id=\"p1\" class=\"page on\">\n  <div class=\"brand\"><span class=\"badge\">__LABEL__</span><span class=\"brandname\">__NAME__</span></div>\n  <div class=\"logo\">📦</div>\n  <h1>Inventory Count</h1>\n  <p>Scan each product's barcode and record it straight to the inventory sheet.</p>\n  <div class=\"card\">\n    <ul class=\"steps\">\n      <li><b>1</b><span>Tap <strong>Next</strong> to start counting the inventory.</span></li>\n      <li><b>2</b><span>When your phone asks, tap <strong>Allow</strong> so the camera can scan barcodes.</span></li>\n      <li><b>3</b><span><strong>Step 1:</strong> point the camera at the barcode. You'll hear a beep and the UPC locks. If a pack won't scan, tap <strong>Type UPC instead</strong>.</span></li>\n      <li><b>4</b><span><strong>Step 2:</strong> point the camera at the product name so it fills in. Check it, add the counts, then tap <strong>Submit</strong>.</span></li>\n    </ul>\n  </div>\n  <p style=\"text-align:center;margin-top:18px\">👉 Click <strong>Next</strong> to count the inventory</p>\n  <button class=\"btn go\" onclick=\"start()\">Next →</button>\n</section>\n\n<section id=\"p2\" class=\"page\">\n  <div class=\"brand\"><span class=\"badge\">__LABEL__</span><span class=\"brandname\">__NAME__</span></div>\n  <div class=\"cam\" id=\"cam\"><video id=\"v\" playsinline muted autoplay></video><div class=\"frame\"></div><div class=\"laser\"></div></div>\n  <div id=\"code\">Point the camera at a barcode</div>\n  <div id=\"upc\"></div>\n  <button class=\"btn reset\" id=\"manualBtn\" type=\"button\" onclick=\"toggleManual()\">Type UPC instead</button>\n  <div id=\"manualBox\">\n    <label for=\"manualUpc\">Digits printed under the barcode</label>\n    <input id=\"manualUpc\" inputmode=\"numeric\" autocomplete=\"off\" enterkeyhint=\"done\" placeholder=\"02896223 or 028200009623\">\n    <button class=\"btn save\" type=\"button\" onclick=\"useManual()\">Use this UPC</button>\n  </div>\n  <div class=\"card\" style=\"margin-top:10px\">\n    <label for=\"name\">Product name</label>\n    <input id=\"name\" placeholder=\"e.g. Coke 20 oz\" autocomplete=\"off\">\n    <button class=\"btn ocr\" id=\"ocrBtn\" onclick=\"toggleOcr()\">📷 Read name from label</button>\n    <div class=\"ocrbox\" id=\"ocrBox\"><div style=\"font-size:17px;font-weight:800;margin-bottom:4px\">📖 Step 2 of 2: Point the camera at the product name on the package</div>Fit the name inside the blue box. It fills in live, or tap <b>Capture</b>. Tap <b>Done</b> when it looks right, then edit if needed.<button class=\"btn cap\" onclick=\"ocrCapture()\">📸 Capture name now</button><div id=\"ocrSt\" style=\"margin-top:6px;opacity:.85\"></div></div>\n    <p class=\"qty-note\">Count individual items, not boxes or cartons. Example: a carton of 10 packs = 10.</p>\n    <div class=\"row\">\n      <div><label for=\"shelf\">Shelf qty</label><input id=\"shelf\" type=\"number\" inputmode=\"numeric\" placeholder=\"0\"></div>\n      <div><label for=\"stock\">Stock qty</label><input id=\"stock\" type=\"number\" inputmode=\"numeric\" placeholder=\"0\"></div>\n    </div>\n    <label for=\"comment\">Comment (optional)</label>\n    <input id=\"comment\" placeholder=\"Optional\">\n    <button class=\"btn save\" onclick=\"save()\">Submit ✓</button>\n    <button class=\"btn reset\" onclick=\"resetScan()\">↺ Reset scan</button>\n    <div id=\"st\"></div>\n  </div>\n</section>\n\n";
  html = html.split('__LABEL__').join(label).split('__NAME__').join(storeName);
  document.body.insertAdjacentHTML('afterbegin', html);
})();
const SHEET_URL='https://script.google.com/macros/s/AKfycbzBJ1M9Cu3l9e_PhcxyTLBwOdkX5-cwsnXQ-Z8P-ZX9c_gDtYJ0LoM-pIS6VtvDzL0/exec';
const $=id=>document.getElementById(id);
let reader,code="",scanT=0,actx,scanStream=null,scanGen=0,scanTimer=0,scanMiss=0,detectorPromise=null;
const grabCanvas=document.createElement('canvas'),grabCtx=grabCanvas.getContext('2d',{willReadFrequently:true});
function beep(){try{const o=actx.createOscillator(),g=actx.createGain();o.type='square';o.frequency.value=1800;g.gain.setValueAtTime(.25,actx.currentTime);g.gain.exponentialRampToValueAtTime(.001,actx.currentTime+.15);o.connect(g);g.connect(actx.destination);o.start();o.stop(actx.currentTime+.15);}catch(e){} if(navigator.vibrate)navigator.vibrate(80);}
function start(){actx=actx||new (window.AudioContext||window.webkitAudioContext)();actx.resume();
  $('p1').classList.remove('on');$('p2').classList.add('on');scan();loadOcr().catch(()=>{});}
function stopScanCamera(){scanGen++;if(scanTimer){clearTimeout(scanTimer);scanTimer=0;}
  if(scanStream){scanStream.getTracks().forEach(t=>t.stop());scanStream=null;}
  const v=$('v');if(v.srcObject)v.srcObject=null;}
async function openScanCamera(){
  const attempts=[
    {video:{facingMode:{ideal:'environment'},width:{ideal:1920},height:{ideal:1080},advanced:[{focusMode:'continuous'}]},audio:false},
    {video:{facingMode:{ideal:'environment'},width:{ideal:1920},height:{ideal:1080}},audio:false},
    {video:{facingMode:'environment'},audio:false}
  ];
  let stream,err;
  for(const c of attempts){try{stream=await navigator.mediaDevices.getUserMedia(c);break;}catch(e){err=e;}}
  if(!stream)throw err||new Error('camera');
  const track=stream.getVideoTracks()[0];
  try{const caps=track.getCapabilities?track.getCapabilities():{};
    if(caps.focusMode&&caps.focusMode.indexOf('continuous')>=0)await track.applyConstraints({advanced:[{focusMode:'continuous'}]});
  }catch(e){}
  return stream;}
function ensureDetector(){if(!('BarcodeDetector' in window))return Promise.resolve(null);
  if(!detectorPromise)detectorPromise=(async()=>{try{
    const want=['upc_e','upc_a','ean_13','ean_8','code_128'];let formats=want;
    if(BarcodeDetector.getSupportedFormats){const ok=await BarcodeDetector.getSupportedFormats();formats=want.filter(f=>ok.indexOf(f)>=0);}
    if(!formats.length)return null;return new BarcodeDetector({formats});
  }catch(e){return null;}})();
  return detectorPromise;}
// Map the on-screen guide (a little padded, so quiet zones stay in frame) back onto the camera pixels.
function guideImage(v){const W=v.videoWidth,H=v.videoHeight;if(!W||!H)return null;
  const vr=v.getBoundingClientRect(),fr=document.querySelector('#cam .frame').getBoundingClientRect();
  const k=Math.max(vr.width/W,vr.height/H),ox=(vr.width-W*k)/2,oy=(vr.height-H*k)/2;
  const padX=fr.width*.12,padY=fr.height*.22;
  let sx=(fr.left-vr.left-padX-ox)/k,sy=(fr.top-vr.top-padY-oy)/k,sw=(fr.width+padX*2)/k,sh=(fr.height+padY*2)/k;
  sx=Math.max(0,sx);sy=Math.max(0,sy);sw=Math.min(W-sx,sw);sh=Math.min(H-sy,sh);
  if(sw<24||sh<24)return null;
  const dw=Math.round(sw),dh=Math.round(sh);
  grabCanvas.width=dw;grabCanvas.height=dh;grabCtx.imageSmoothingEnabled=false;
  grabCtx.drawImage(v,sx,sy,sw,sh,0,0,dw,dh);
  const img=grabCtx.getImageData(0,0,dw,dh);return {data:img.data,width:dw,height:dh};}
function fullImage(v){const W=v.videoWidth,H=v.videoHeight;if(!W||!H)return null;
  const scale=Math.min(1,1280/Math.max(W,H)),dw=Math.round(W*scale),dh=Math.round(H*scale);
  grabCanvas.width=dw;grabCanvas.height=dh;grabCtx.imageSmoothingEnabled=scale===1?false:true;
  grabCtx.drawImage(v,0,0,dw,dh);const img=grabCtx.getImageData(0,0,dw,dh);return {data:img.data,width:dw,height:dh};}
function showUpc(info){const upc=$('upc');upc.textContent='';
  const main=document.createElement('div');main.textContent=info.upca||info.code;upc.appendChild(main);
  if(info.upce&&info.upca){const sub=document.createElement('div');sub.className='sub';sub.textContent='UPC-E '+info.upce;upc.appendChild(sub);}}
function lockCode(info){if(!info||!info.code||code)return;
  code=info.code;scanT=performance.now();beep();stopScanCamera();
  $('cam').classList.add('locked');$('code').innerHTML='<span class="pill">✓ UPC LOCKED</span>';showUpc(info);
  $('st').textContent=info.unverified?'Check digit not verified. Saving exactly what you typed.':'';
  setTimeout(()=>{if(code&&!ocrOn)toggleOcr();},900);}
async function readFrame(v,gen){if(gen!==scanGen||code)return;
  try{const det=await ensureDetector();
    if(gen!==scanGen||code)return;
    if(det){const found=await det.detect(v);
      if(found&&found.length){const info=ScannerKit.normalizeBarcode(found[0].rawValue,found[0].format);if(info&&info.code){lockCode(info);return;}}}
  }catch(e){}
  if(typeof ZXing==='undefined'||!window.ScannerKit)return;
  scanMiss++;
  const sideways=scanMiss%2===0, thorough=scanMiss%4===0;
  let hit=null;
  try{const g=guideImage(v);if(g)hit=ScannerKit.decodeScanImage(ZXing,g.data,g.width,g.height,{rotate:sideways,thorough:thorough});
    if(!hit&&!thorough&&scanMiss%5===0){const f=fullImage(v);if(f)hit=ScannerKit.decodeScanImage(ZXing,f.data,f.width,f.height,{rotate:true,thorough:false});}
  }catch(e){console.warn('scan',e);}
  if(gen!==scanGen||code)return;
  if(hit)lockCode(hit);}
function pump(gen){if(gen!==scanGen||code)return;const v=$('v');
  if(v.videoWidth){readFrame(v,gen).then(()=>{if(gen===scanGen&&!code)scanTimer=setTimeout(()=>pump(gen),160);});return;}
  scanTimer=setTimeout(()=>pump(gen),120);}
function scan(){stopScanCamera();if(reader){try{reader.reset();}catch(e){}}
  code='';scanMiss=0;$('cam').classList.remove('locked');
  $('code').innerHTML='<b>Step 1 of 2:</b> Point the camera at the barcode';$('upc').textContent='';
  const gen=scanGen;
  openScanCamera().then(stream=>{if(gen!==scanGen){stream.getTracks().forEach(t=>t.stop());return;}
    scanStream=stream;const v=$('v');v.playsInline=true;v.srcObject=stream;return v.play();
  }).then(()=>{if(gen===scanGen)pump(gen);}).catch(()=>{if(scanStream){scanStream.getTracks().forEach(t=>t.stop());scanStream=null;}
    $('code').textContent='Camera blocked. Allow camera access in your browser settings and reload.';});}
function toggleManual(){const box=$('manualBox'),open=box.style.display!=='block';
  box.style.display=open?'block':'none';$('manualBtn').textContent=open?'Hide typed UPC':'Type UPC instead';
  if(open)$('manualUpc').focus();}
function useManual(){const info=ScannerKit.interpretManual($('manualUpc').value);
  if(!info){$('st').textContent='Type the digits under the barcode';$('manualUpc').focus();return;}
  $('manualBox').style.display='none';$('manualBtn').textContent='Type UPC instead';$('manualUpc').value='';
  if(ocrOn){code=info.code;showUpc(info);$('st').textContent=info.unverified?'Check digit not verified. Saving exactly what you typed.':'';return;}
  if(code)code='';
  lockCode(info);}
let ocrOn=false,ocrStream=null,worker=null,workerP=null,ocrRun=0,ocrScale=0,ocrHist=[],ocrBest=null,ocrUserEdit=false,ocrFrame=0,ocrBusy=false;
const OCR_WL="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 &'-.%/";
// Load the text reader once (started early, on Next, so step 2 is ready sooner)
function loadOcr(){if(worker)return Promise.resolve(worker);if(workerP)return workerP;
  if(typeof Tesseract==='undefined')return Promise.reject(new Error('Tesseract script not loaded'));
  workerP=Promise.race([(async()=>{const w=await Tesseract.createWorker('eng',1);
      await w.setParameters({tessedit_pageseg_mode:'11',preserve_interword_spaces:'1',tessedit_char_whitelist:OCR_WL,user_defined_dpi:'300'});worker=w;return w;})(),
    new Promise((_,rej)=>setTimeout(()=>rej(new Error('timeout')),60000))]).catch(e=>{workerP=null;throw e;});
  return workerP;}
async function toggleOcr(){if(ocrOn){stopOcr();return;}
  stopScanCamera();if(reader){try{reader.reset();}catch(e){}}ocrOn=true;const run=++ocrRun;ocrHist=[];ocrBest=null;ocrUserEdit=false;ocrFrame=0;
  $('ocrBtn').textContent='✓ Done';$('ocrBox').style.display='block';$('cam').classList.remove('locked');$('cam').classList.add('ocring');$('code').innerHTML='<span class="pill">✓ UPC LOCKED</span> <b>Step 2:</b> point at the product name';
  const v=$('v');
  try{ocrStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment',width:{ideal:1920},height:{ideal:1080},advanced:[{focusMode:'continuous'}]}})
      .catch(()=>navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}}));
    if(!ocrOn||run!==ocrRun){ocrStream.getTracks().forEach(t=>t.stop());return;}
    const tr=ocrStream.getVideoTracks()[0];try{const cap=tr.getCapabilities?tr.getCapabilities():{};if(cap.focusMode&&cap.focusMode.includes('continuous'))await tr.applyConstraints({advanced:[{focusMode:'continuous'}]});}catch(e){}
    v.srcObject=ocrStream;await v.play().catch(()=>{});
    for(let i=0;i<50&&!v.videoWidth;i++)await new Promise(r=>setTimeout(r,100));}
  catch(e){$('ocrSt').textContent='Camera blocked. Allow camera access and try again.';stopOcr();return;}
  if(!worker){$('ocrSt').textContent='Loading text reader (first time only)...';
    try{await loadOcr();}catch(e){if(run===ocrRun&&ocrOn){$('ocrSt').innerHTML='⚠️ The text reader could not load. Check your internet and tap Read name again, or just type the name.';
      ocrOn=false;if(ocrStream){ocrStream.getTracks().forEach(t=>t.stop());ocrStream=null;}$('ocrBtn').textContent='📷 Read name from label';$('cam').classList.remove('ocring');if(code)$('cam').classList.add('locked');}return;}}
  if(run!==ocrRun||!ocrOn)return;
  $('ocrSt').textContent='Fit the product name inside the box and hold steady...';ocrLoop(run);}
// Crop exactly the on-screen guide box (accounts for object-fit:cover), scale, and clean up the pixels
function grabGuide(v,scaleOverride){const W=v.videoWidth,H=v.videoHeight;if(!W||!H)return null;
  const vr=v.getBoundingClientRect(),fr=document.querySelector('#cam .frame').getBoundingClientRect();
  const k=Math.max(vr.width/W,vr.height/H),ox=(vr.width-W*k)/2,oy=(vr.height-H*k)/2;
  let sx=(fr.left-vr.left-ox)/k,sy=(fr.top-vr.top-oy)/k,sw=fr.width/k,sh=fr.height/k;
  const px=sw*.04,py=sh*.08;sx=Math.max(0,sx-px);sy=Math.max(0,sy-py);sw=Math.min(W-sx,sw+2*px);sh=Math.min(H-sy,sh+2*py);
  let s=scaleOverride||ocrScale||Math.min(220/sh,1600/sw);s=Math.max(.4,Math.min(s,3,1800/sw,800/sh));
  const cw=Math.round(sw*s),ch=Math.round(sh*s),c=document.createElement('canvas');c.width=cw;c.height=ch;
  const x=c.getContext('2d',{willReadFrequently:true});x.imageSmoothingEnabled=true;x.imageSmoothingQuality='high';x.drawImage(v,sx,sy,sw,sh,0,0,cw,ch);
  return {c,x,s,cw,ch};}
function prep(g,mode){const {x,cw,ch}=g,id=x.getImageData(0,0,cw,ch),d=id.data,n=cw*ch,y=new Float32Array(n),hist=new Uint32Array(256);
  for(let i=0,j=0;i<n;i++,j+=4){const l=.299*d[j]+.587*d[j+1]+.114*d[j+2];y[i]=l;hist[l|0]++;}
  let lo=0,hi=255,acc=0;for(;lo<255&&(acc+=hist[lo])<n*.01;lo++);acc=0;for(;hi>0&&(acc+=hist[hi])<n*.01;hi--);const rg=Math.max(1,hi-lo);
  for(let i=0;i<n;i++){const t=(y[i]-lo)*255/rg;y[i]=t<0?0:t>255?255:t;}
  // unsharp mask (3x3) to fight focus blur
  const z=new Float32Array(n);for(let r=0;r<ch;r++)for(let q=0;q<cw;q++){const i=r*cw+q;if(r===0||q===0||r===ch-1||q===cw-1){z[i]=y[i];continue;}
    const b=(y[i-1]+y[i+1]+y[i-cw]+y[i+cw]+y[i-cw-1]+y[i-cw+1]+y[i+cw-1]+y[i+cw+1]+y[i])/9,t=y[i]+1.2*(y[i]-b);z[i]=t<0?0:t>255?255:t;}
  // Otsu threshold
  const h2=new Uint32Array(256);for(let i=0;i<n;i++)h2[z[i]|0]++;let sum=0;for(let i=0;i<256;i++)sum+=i*h2[i];
  let sB=0,wB=0,best=0,th=128;for(let i=0;i<256;i++){wB+=h2[i];if(!wB)continue;const wF=n-wB;if(!wF)break;sB+=i*h2[i];const mB=sB/wB,mF=(sum-sB)/wF,b=wB*wF*(mB-mF)*(mB-mF);if(b>best){best=b;th=i;}}
  // polarity: text is the minority class; also check the border. Make it dark text on white.
  let dark=0,bd=0,bt=0;for(let i=0;i<n;i++)if(z[i]<th)dark++;
  for(let q=0;q<cw;q+=2){bt+=2;if(z[q]<th)bd++;if(z[(ch-1)*cw+q]<th)bd++;}for(let r=0;r<ch;r+=2){bt+=2;if(z[r*cw]<th)bd++;if(z[r*cw+cw-1]<th)bd++;}
  const inv=(dark/n+bd/bt)/2>.5;
  let out;if(mode==='bin'){// adaptive (local mean) threshold handles gradients/glare
    const ii=new Float64Array((cw+1)*(ch+1));for(let r=0;r<ch;r++){let rs=0;for(let q=0;q<cw;q++){rs+=z[r*cw+q];ii[(r+1)*(cw+1)+q+1]=ii[r*(cw+1)+q+1]+rs;}}
    const R=Math.max(8,Math.round(Math.min(cw,ch)/6));out=new Uint8ClampedArray(n);
    for(let r=0;r<ch;r++){const r0=Math.max(0,r-R),r1=Math.min(ch,r+R+1);for(let q=0;q<cw;q++){const q0=Math.max(0,q-R),q1=Math.min(cw,q+R+1);
      const m=(ii[r1*(cw+1)+q1]-ii[r0*(cw+1)+q1]-ii[r1*(cw+1)+q0]+ii[r0*(cw+1)+q0])/((r1-r0)*(q1-q0)),v=z[r*cw+q];
      const fg=inv?v>m+12:v<m-12;out[r*cw+q]=fg?0:255;}}}
  for(let i=0,j=0;i<n;i++,j+=4){const v=out?out[i]:(inv?255-z[i]:z[i]);d[j]=d[j+1]=d[j+2]=v;d[j+3]=255;}
  x.putImageData(id,0,0);return g.c;}
function ocrWords(data){if(data.words&&data.words.length)return data.words;const w=[];(data.blocks||[]).forEach(b=>(b.paragraphs||[]).forEach(p=>(p.lines||[]).forEach(l=>(l.words||[]).forEach(x=>w.push(x)))));return w;}
// Keep confident words, group into text lines, prefer the biggest line(s) = usually the product name
function wordList(data,minConf){const ws=[];for(const w of ocrWords(data)){const t=(w.text||'').replace(/[^A-Za-z0-9 &'.%\/-]/g,'').trim(),b=w.bbox,h=b.y1-b.y0;
    if(!t||w.confidence<minConf||h<6)continue;const al=(t.match(/[A-Za-z0-9]/g)||[]).length;if(!al&&t!=='&')continue;if(t.length===1&&w.confidence<80&&t!=='&'&&!/^[AI0-9]$/.test(t))continue;
    ws.push({t,h,cy:(b.y0+b.y1)/2,x:b.x0,x1:b.x1,y0:b.y0,y1:b.y1,c:w.confidence,al});}return ws;}
function groupLines(ws){ws.sort((a,b)=>a.cy-b.cy);const L=[];
  for(const w of ws){let g=L.find(l=>Math.abs(l.cy-w.cy)<l.h*.5&&w.h/l.h>.6&&w.h/l.h<1.6);if(!g){g={ws:[],cy:w.cy,h:w.h};L.push(g);}g.ws.push(w);
    g.cy=g.ws.reduce((s,x)=>s+x.cy,0)/g.ws.length;const hs=g.ws.map(x=>x.h).sort((a,b)=>a-b);g.h=hs[hs.length>>1];}
  L.forEach(l=>{l.ws.sort((a,b)=>a.x-b.x);l.c=l.ws.reduce((s,x)=>s+x.c,0)/l.ws.length;l.al=l.ws.reduce((s,x)=>s+x.al,0);l.score=l.h*(l.c/100);
    l.x0=Math.min(...l.ws.map(w=>w.x));l.x1=Math.max(...l.ws.map(w=>w.x1));l.y0=Math.min(...l.ws.map(w=>w.y0));l.y1=Math.max(...l.ws.map(w=>w.y1));});return L;}
function pickName(data){const ws=wordList(data,55);if(!ws.length)return null;
  const ok=groupLines(ws).filter(l=>l.al>=3&&l.c>=60);if(!ok.length)return null;ok.sort((a,b)=>b.score-a.score);const top=ok[0];
  const pick=ok.filter(l=>l===top||(l.h>=top.h*.7&&Math.abs(l.cy-top.cy)<top.h*2.6)).sort((a,b)=>a.cy-b.cy);
  const text=pick.map(l=>l.ws.map(w=>w.t).join(' ')).join(' ').replace(/\s+/g,' ').trim();
  return {text,conf:pick.reduce((s,l)=>s+l.c,0)/pick.length,h:top.h,lines:pick.length,
    box:{x0:Math.min(...pick.map(l=>l.x0)),x1:Math.max(...pick.map(l=>l.x1)),y0:Math.min(...pick.map(l=>l.y0)),y1:Math.max(...pick.map(l=>l.y1))}};}
const clean=t=>t.replace(/\s+/g,' ').trim();
// Pass 1 (sparse text) finds where the biggest text is; pass 2 re-reads just that line strip as a single line, so words crossed by graphics aren't dropped
async function ocrOnce(v,mode,psm){const g=grabGuide(v);if(!g)return null;const c=prep(g,mode);
  await worker.setParameters({tessedit_pageseg_mode:psm});const r=await worker.recognize(c,{},{text:true,blocks:true,hocr:false,tsv:false});
  const p=pickName(r.data);if(!p)return null;p.mode=mode;p.psm=psm;p.s=g.s;
  try{const h=p.h,b=p.box,x0=Math.max(0,b.x0-h*3),x1=Math.min(c.width,b.x1+h*3),y0=Math.max(0,b.y0-h*.35),y1=Math.min(c.height,b.y1+h*.35);
    const lc=document.createElement('canvas');lc.width=Math.round(x1-x0);lc.height=Math.round(y1-y0);lc.getContext('2d').drawImage(c,x0,y0,x1-x0,y1-y0,0,0,lc.width,lc.height);
    await worker.setParameters({tessedit_pageseg_mode:p.lines>1?'6':'7'});const r2=await worker.recognize(lc,{},{text:true,blocks:true,hocr:false,tsv:false});
    const w2=wordList(r2.data,0).filter(w=>w.h>=h*.55);
    if(w2.length){const L2=groupLines(w2).filter(l=>l.h>=h*.7).sort((a,b)=>a.cy-b.cy);let t2=clean(L2.map(l=>l.ws.map(w=>w.t).join(' ')).join(' '));const c2=w2.reduce((s,w)=>s+w.c,0)/w2.length;
      if(!p.text.includes('-'))t2=clean(t2.replace(/-/g,' '));
      const an=t=>t.toLowerCase().replace(/[^a-z0-9]/g,''),a1=an(p.text),a2=an(t2);
      // accept the line re-read if it's confident, or if it contains every pass-1 word in order (just more complete)
      let i=0;const inOrder=wset(p.text).every(w=>{const j=a2.indexOf(w,i);if(j<0)return false;i=j+w.length;return true;});
      if(a2.length>=a1.length&&a2.length<=a1.length*2+4&&(c2>=55||inOrder)){p.text=t2;p.two=1;}}}catch(e){}
  return p;}
function adaptScale(p){if(!p||!p.h)return;const want=48,ns=p.s*want/p.h;ocrScale=Math.max(.5,Math.min(3,ns));}
function showName(p,final){if(!p||ocrUserEdit)return;$('name').value=p.text.slice(0,80);$('ocrSt').textContent=(final?'Captured: "':'Got: "')+p.text.slice(0,80)+'" — tap Done if right';}
// Stabilize: vote across recent frames (a reading also backs any longer reading that contains it), bigger + more confident text weighs more
const wset=t=>t.toLowerCase().split(/\s+/).map(w=>w.replace(/[^a-z0-9]/g,'')).filter(Boolean);
function vote(){const hs=ocrHist.filter(Boolean);let best=null;
  for(const p of hs){const W=wset(p.text);let sc=0,n=0;for(const q of hs){const Q=wset(q.text);if(Q.length&&Q.every(w=>W.includes(w))){sc+=q.conf*q.h;n++;}}
    if(!best||sc>best.sc||(sc===best.sc&&p.text.length>best.text.length))best={...p,sc,n};}return best;}
// Live mode: show the reading only once it repeats or is very confident (no flicker)
async function ocrLoop(run){const v=$('v');
  while(ocrOn&&run===ocrRun){if(v.videoWidth&&!ocrBusy){ocrBusy=true;ocrFrame++;
      try{const p=await ocrOnce(v,'gray','11');if(run!==ocrRun||!ocrOn)break;
        ocrHist.push(p);if(ocrHist.length>8)ocrHist.shift();if(p)adaptScale(p);
        const b=vote();if(b&&(b.n>=2||b.conf>=88)){if(!ocrBest||ocrBest.text!==b.text){ocrBest=b;showName(b);}}
        else if(!ocrBest)$('ocrSt').textContent=p?'Reading... hold steady':'No clear text yet. Fit the name in the box, move closer, avoid glare.';}
      catch(e){console.warn('OCR',e);}finally{ocrBusy=false;}}
    await new Promise(r=>setTimeout(r,150));}}
// Capture: one read of the current frame now (falls back to adaptive threshold for glare/gradients)
async function ocrCapture(){if(!ocrOn||!worker)return;const v=$('v'),run=ocrRun;$('ocrSt').textContent='Capturing...';
  while(ocrBusy)await new Promise(r=>setTimeout(r,50));ocrBusy=true;let best=null;
  try{for(const m of ['gray','bin']){const p=await ocrOnce(v,m,'11');if(p&&(!best||p.conf*Math.sqrt(p.h)>best.conf*Math.sqrt(best.h)))best=p;if(best&&best.conf>=75)break;}}catch(e){console.warn('OCR',e);}finally{ocrBusy=false;}
  if(run!==ocrRun)return;if(best){ocrUserEdit=false;ocrBest=best;ocrHist.push(best,best);showName(best,true);}else $('ocrSt').textContent='Could not read it. Move closer so the name fills the box, then tap Capture again.';}
function stopOcr(){ocrOn=false;ocrRun++;if(ocrStream){ocrStream.getTracks().forEach(t=>t.stop());ocrStream=null;}
  $('ocrBtn').textContent='📷 Read name from label';$('ocrBox').style.display='none';$('cam').classList.remove('ocring');if(code){$('cam').classList.add('locked');$('code').innerHTML='<span class="pill">✓ UPC LOCKED</span> Confirm the name and tap Submit';}$('name').focus();}
function clearFields(){['name','shelf','stock','comment'].forEach(f=>$(f).value='');}
function resetScan(){if(ocrOn)stopOcr();if(reader){try{reader.reset();}catch(e){}}clearFields();$('st').textContent='';$('manualUpc').value='';scan();}
function hasQty(v){return String(v==null?'':v).trim()!=='';}
function save(){if(!code){$('st').textContent='⚠️ Scan a barcode first';return;}
  if(!$('name').value.trim()){$('st').textContent='⚠️ Type the product name';$('name').focus();return;}
  if(!hasQty($('shelf').value)&&!hasQty($('stock').value)){$('st').textContent='Enter shelf or stock quantity before saving';$('shelf').focus();return;}
  const it={code,name:$('name').value.trim(),shelf:$('shelf').value,stock:$('stock').value,comment:$('comment').value,store:STORE_LABEL};
  $('st').textContent='Saving...';const t0=performance.now(),s0=scanT;
  fetch(SHEET_URL,{method:'POST',mode:'no-cors',headers:{'Content-Type':'text/plain'},body:JSON.stringify(it)})
  .then(()=>{const t1=performance.now(),req=Math.round(t1-t0),tot=Math.round(t1-s0);
    $('st').textContent='✅ Saved '+it.code+' in '+req+' ms (scan to saved: '+(tot/1000).toFixed(1)+' s)';console.log('Sheet save',{requestMs:req,scanToSavedMs:tot});})
  .catch(()=>{$('st').textContent='❌ Save failed. Check internet and try again.';});
  if(ocrOn)stopOcr();clearFields();scan();}
$('name').addEventListener('keydown',e=>{if(e.key==='Enter')save();});
$('manualUpc').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();useManual();}});
$('name').addEventListener('input',()=>{if(ocrOn)ocrUserEdit=true;});
