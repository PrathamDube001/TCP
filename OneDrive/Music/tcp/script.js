var E=['ESTABLISHED','ESTABLISHED'];
var SC={
hs:{name:'Handshake',intro:'Before any data moves, the two sides agree on starting sequence numbers. This takes three segments: SYN, SYN-ACK, ACK.',st:['CLOSED','LISTEN'],steps:[
{d:'cs',f:['SYN'],seq:100,ack:0,len:0,h:'Client sends SYN',t:'The client wants to open a connection. It picks a starting sequence number (here 100) and sets the SYN flag. Nothing has been received yet, so ACK is off.',s:['SYN-SENT','LISTEN']},
{d:'sc',f:['SYN','ACK'],seq:300,ack:101,len:0,h:'Server replies SYN-ACK',t:'The server accepts, picks its own starting number (300) and acknowledges the client with ack=101: “the next byte I expect is 101”. A SYN uses up one sequence number.',s:['SYN-SENT','SYN-RECEIVED']},
{d:'cs',f:['ACK'],seq:101,ack:301,len:0,h:'Client sends ACK',t:'The client acknowledges the server’s SYN. Both sides now know the other can send and receive, so the connection is ESTABLISHED and data can flow.',s:E}]},
data:{name:'Data transfer',intro:'Once established, both sides send data and acknowledge what they receive. ACKs say which byte is expected next.',st:E,steps:[
{d:'cs',f:['PSH','ACK'],seq:101,ack:301,len:100,h:'Client sends a request',t:'The client sends 100 bytes (say, an HTTP request). seq=101 is the number of the first byte in this segment. PSH asks the receiver to hand the data to the application right away.',s:E},
{d:'sc',f:['ACK'],seq:301,ack:201,len:0,h:'Server acknowledges',t:'Bytes 101 to 200 arrived, so the server answers ack=201: “next I expect byte 201”. ACKs are cumulative.',s:E},
{d:'sc',f:['PSH','ACK'],seq:301,ack:201,len:200,h:'Server sends the response',t:'The server sends 200 bytes starting at its own sequence number 301. Both directions work independently, which is called full duplex.',s:E},
{d:'cs',f:['ACK'],seq:201,ack:501,len:0,h:'Client acknowledges',t:'Server bytes 301 to 500 arrived, so ack=501. Each ACK also carries a window size, which tells the sender how much more the receiver can buffer. That is flow control.',s:E}]},
loss:{name:'Packet loss',intro:'Networks drop packets. Watch how sequence numbers and timers let TCP notice a missing segment and resend it.',st:E,steps:[
{d:'cs',f:['ACK'],seq:1,ack:1,len:100,h:'Segment 1 is sent',t:'Bytes 1 to 100 are sent. The sender starts a retransmission timer for this data.',s:E},
{d:'sc',f:['ACK'],seq:1,ack:101,len:0,h:'Segment 1 is acknowledged',t:'It arrived in order, so the server answers ack=101 and the sender can stop that timer.',s:E},
{d:'cs',f:['ACK'],seq:101,ack:1,len:100,lost:1,h:'Segment 2 is lost',t:'Bytes 101 to 200 vanish on the way (a congested router, a bad link). Neither side knows yet. The sender’s timer for this segment keeps running.',s:E},
{d:'cs',f:['ACK'],seq:201,ack:1,len:100,h:'Segment 3 arrives',t:'Bytes 201 to 300 get through, but the receiver is still missing 101 to 200, so it cannot deliver them in order.',s:E},
{d:'sc',f:['ACK'],seq:1,ack:101,len:0,h:'Duplicate ACK',t:'The server repeats ack=101: “I’m still waiting for byte 101”. Real TCP treats three duplicate ACKs as a signal to resend at once. To keep this simple, the sender here recovers by timeout.',s:E},
{d:'cs',f:['ACK'],seq:101,ack:1,len:100,h:'Retransmission',t:'The timer expires with no ACK, so the sender resends bytes 101 to 200. This is how TCP delivers reliably over an unreliable network.',s:E},
{d:'sc',f:['ACK'],seq:1,ack:301,len:0,h:'Cumulative ACK',t:'The server already holds bytes 201 to 300, so a single ACK covers everything: ack=301. The stream is complete and in order.',s:E}]},
end:{name:'Teardown',intro:'Each direction is closed on its own, so closing a connection takes four segments: FIN, ACK, FIN, ACK.',st:E,steps:[
{d:'cs',f:['FIN','ACK'],seq:500,ack:800,len:0,h:'Client sends FIN',t:'The client has nothing more to send, so it sets the FIN flag. It can still receive data.',s:['FIN-WAIT-1','ESTABLISHED']},
{d:'sc',f:['ACK'],seq:800,ack:501,len:0,h:'Server acknowledges the FIN',t:'The server answers ack=501 (a FIN uses one sequence number). The server may keep sending data, so the connection is half-closed.',s:['FIN-WAIT-2','CLOSE-WAIT']},
{d:'sc',f:['FIN','ACK'],seq:800,ack:501,len:0,h:'Server sends its own FIN',t:'When the server application is finished, it closes its direction too.',s:['FIN-WAIT-2','LAST-ACK']},
{d:'cs',f:['ACK'],seq:501,ack:801,len:0,h:'Client sends the final ACK',t:'The server closes as soon as this arrives. The client waits in TIME-WAIT for about two maximum segment lifetimes, in case this ACK was lost and the server resends its FIN. Then it closes too.',s:['TIME-WAIT','CLOSED']}]}
};
var cur='hs',n=0,timer=null;
var $=function(i){return document.getElementById(i)};
var reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;

function tabs(){
  var h='';
  for(var k in SC)h+='<button data-k="'+k+'" aria-pressed="'+(k===cur)+'">'+SC[k].name+'</button>';
  $('tabs').innerHTML=h;
}
function stop(){clearInterval(timer);timer=null;$('play').textContent='Play'}
function chips(f){
  return ['SYN','ACK','PSH','FIN'].map(function(x){return '<span class="chip'+(f.indexOf(x)>-1?' on':'')+'">'+x+'</span>'}).join('');
}
function draw(){
  var sc=SC[cur],L=sc.steps.length,H=84+L*58,X1=80,X2=520,s='';
  s+='<defs><marker id="ah" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="context-stroke"/></marker></defs>';
  s+='<text class="who" x="'+X1+'" y="22" text-anchor="middle" style="fill:var(--c)">Client</text><text class="who" x="'+X2+'" y="22" text-anchor="middle" style="fill:var(--s)">Server</text>';
  s+='<line x1="'+X1+'" y1="34" x2="'+X1+'" y2="'+(H-8)+'" stroke="var(--c)" stroke-width="2" stroke-dasharray="4 5"/>';
  s+='<line x1="'+X2+'" y1="34" x2="'+X2+'" y2="'+(H-8)+'" stroke="var(--s)" stroke-width="2" stroke-dasharray="4 5"/>';
  for(var q=n;q<L;q++){var gc=sc.steps[q].d==='cs',gy=56+q*58;s+='<line x1="'+(gc?X1:X2)+'" y1="'+gy+'" x2="'+(gc?X2:X1)+'" y2="'+(gy+40)+'" stroke="var(--mu)" stroke-width="2" stroke-dasharray="3 7" opacity=".4"/>';}
  if(n===0)s+='<text x="300" y="46" text-anchor="middle" style="fill:var(--mu);font-size:14px">Press Next step to send the first segment</text>';
  for(var i=0;i<n;i++){
    var p=sc.steps[i],cs=p.d==='cs',xa=cs?X1:X2,xb=cs?X2:X1,y1=56+i*58,y2=y1+40,last=i===n-1;
    var col=cs?'var(--c)':'var(--s)';
    var xe=p.lost?xa+(xb-xa)*.6:xb,ye=p.lost?y1+24:y2;
    if(p.lost)col='var(--bad)';
    s+='<line x1="'+xa+'" y1="'+y1+'" x2="'+xe+'" y2="'+ye+'" stroke="'+col+'" stroke-width="'+(last?3:2)+'" opacity="'+(last?1:.65)+'"'+(p.lost?' stroke-dasharray="6 4"':' marker-end="url(#ah)"')+'/>';
    if(p.lost)s+='<text x="'+xe+'" y="'+(ye+5)+'" text-anchor="middle" style="fill:var(--bad);font-size:20px">✕</text>';
    var lab=p.f.join(',')+' seq='+p.seq+(p.f.indexOf('ACK')>-1?' ack='+p.ack:'')+(p.len?' len='+p.len:'');
    s+='<text class="halo" x="300" y="'+((y1+y2)/2-6)+'" text-anchor="middle">'+lab+'</text>';
    s+='<text x="300" y="'+((y1+y2)/2-6)+'" text-anchor="middle">'+lab+'</text>';
    if(last&&!reduce)s+='<circle r="6" fill="'+col+'"><animateMotion dur=".8s" fill="freeze" path="M'+xa+','+y1+' L'+xe+','+ye+'"/></circle>';
  }
  var d=$('dia');d.setAttribute('viewBox','0 0 600 '+H);d.innerHTML=s;
}
function info(){
  var sc=SC[cur],L=sc.steps.length,p=n?sc.steps[n-1]:null,st=p?p.s:sc.st;
  $('cs').textContent=st[0];$('ss').textContent=st[1];
  if(!p){$('h').textContent=sc.name;$('t').textContent=sc.intro+' Press Next step to begin.';$('hdr').innerHTML='';}
  else{
    $('h').textContent='Step '+n+' of '+L+': '+p.h;$('t').textContent=p.t;
    $('hdr').innerHTML='<div class="chips" aria-label="TCP flags set">'+chips(p.f)+'</div><div class="f"><div><span>seq </span>'+p.seq+'</div><div><span>ack </span>'+(p.f.indexOf('ACK')>-1?p.ack:'n/a')+'</div><div><span>data </span>'+p.len+' bytes</div></div>'+(p.lost?'<p class="bad" style="margin:10px 0 0;font-size:14px">This segment never reaches the server.</p>':'');
  }
  $('back').disabled=n===0;$('next').disabled=n===L;
  if(n===L)stop();
}
function go(){draw();info()}
function step(d){n=Math.max(0,Math.min(SC[cur].steps.length,n+d));go()}

$('tabs').addEventListener('click',function(e){var k=e.target.getAttribute&&e.target.getAttribute('data-k');if(!k)return;cur=k;n=0;stop();tabs();go()});
$('next').onclick=function(){stop();step(1)};
$('back').onclick=function(){stop();step(-1)};
$('reset').onclick=function(){stop();n=0;go()};
$('play').onclick=function(){
  if(timer){stop();return}
  if(n===SC[cur].steps.length)n=0;
  $('play').textContent='Pause';step(1);
  timer=setInterval(function(){if(n<SC[cur].steps.length)step(1);else stop()},2200);
};
var NV=[['s-walk','Walkthrough'],['s-win','Windows'],['s-sim','Simulator'],['s-hdr','Header'],['s-udp','TCP vs UDP']];$('nav').innerHTML=NV.map(function(a){return `<button data-t='${a[0]}'>${a[1]}</button>`}).join('');$('nav').onclick=function(e){var t=e.target.getAttribute('data-t');if(t)$(t).scrollIntoView({behavior:reduce?'auto':'smooth'})};var W;function wreset(){W={cw:1,ss:16,ack:0,h:[{c:1,l:''}]};wdraw()}function wstep(k){if(W.h.length>=40){wreset();return}if(!k){W.ack+=W.cw;W.cw=W.cw<W.ss?Math.min(W.cw*2,W.ss):W.cw+1}else{W.ss=Math.max(2,W.cw>>1);W.cw=k==='d'?W.ss:1}W.h.push({c:W.cw,l:k});wdraw()}function wdraw(){var b=Math.max(0,W.ack-4),s='',i,g,f;for(i=0;i<40;i++){g=b+i;f=g<W.ack?'var(--c)':g<W.ack+W.cw?'var(--s)':'none';s+=`<rect x='${i*15}' y='2' width='13' height='22' rx='2' fill='${f}' stroke='${f==='none'?'var(--ln)':f}'/>`;if(g%5===0)s+=`<text x='${i*15+6}' y='40' text-anchor='middle' style='font-size:13px;fill:var(--mu)'>${g+1}</text>`}$('wstrip').innerHTML=s;var mx=Math.max(20,W.ss+4,Math.max.apply(null,W.h.map(function(p){return p.c}))+2),sx=540/Math.max(W.h.length-1,10),Y=function(v){return 170-v*150/mx};s=`<line x1='40' y1='170' x2='580' y2='170' stroke='var(--ln)'/><line x1='40' y1='20' x2='40' y2='170' stroke='var(--ln)'/><line x1='40' y1='${Y(W.ss)}' x2='580' y2='${Y(W.ss)}' stroke='var(--mu)' stroke-dasharray='5 4'/><text x='578' y='${Y(W.ss)-5}' text-anchor='end' style='fill:var(--mu)'>ssthresh ${W.ss}</text><polyline fill='none' stroke='var(--s)' stroke-width='2.5' points='${W.h.map(function(p,j){return (40+j*sx)+','+Y(p.c)}).join(' ')}'/>`;W.h.forEach(function(p,j){s+=`<circle cx='${40+j*sx}' cy='${Y(p.c)}' r='${p.l?5:3}' fill='${p.l?'var(--bad)':'var(--s)'}'/>`});s+=`<text x='44' y='14' style='fill:var(--mu)'>cwnd (segments)</text><text x='580' y='188' text-anchor='end' style='fill:var(--mu)'>time (RTTs)</text>`;$('wchart').innerHTML=s;var l=W.h[W.h.length-1].l;$('wtxt').innerHTML=`<b>cwnd = ${W.cw}</b> segment${W.cw>1?'s':''} in flight. ${l==='d'?'Duplicate ACKs signalled a loss: ssthresh and cwnd were halved. ':l==='t'?'Timeout: ssthresh was halved and cwnd restarts at 1. ':''}${W.cw<W.ss?'Slow start: cwnd doubles every RTT until it reaches ssthresh.':'Congestion avoidance: cwnd grows by 1 segment per RTT.'}`}$('wn').onclick=function(){wstep('')};$('wd').onclick=function(){wstep('d')};$('wt').onclick=function(){wstep('t')};$('wr').onclick=wreset;wreset();var sT=null;$('loss').oninput=function(){$('lv').textContent=this.value+'%'};$('go').onclick=function(){clearInterval(sT);var m=($('msg').value||'HELLO').slice(0,60),p=$('loss').value/100,ev=[],rx='',tx=0,rt=0,seq=1,ok=true,n=0,i,a,g,sg;for(i=0;i<m.length&&ok;i+=4){sg=m.substr(i,4);g=false;a=0;n++;while(true){a++;tx++;if(a>1)rt++;if(a>10){ev.push(['Gave up after 10 tries: connection reset (RST)','bad']);ok=false;break}ev.push(['→ seq='+seq+' “'+sg+'” sent'+(a>1?' (retransmission)':''),'']);if(Math.random()<p){ev.push(['✕ segment lost, sender timer expires','bad']);continue}if(!g){g=true;rx+=sg;ev.push(['✓ server delivers “'+sg+'”','',rx])}else ev.push(['server already has seq='+seq+': discards the duplicate and re-sends the ACK','']);if(Math.random()<p){ev.push(['✕ ACK lost, sender timer expires','bad']);continue}ev.push(['← ACK ack='+(seq+sg.length)+' received','ok']);break}seq+=sg.length}$('log').innerHTML='';$('rx').textContent='';$('stats').innerHTML='';var k=0;sT=setInterval(function(){if(k>=ev.length){clearInterval(sT);$('stats').innerHTML=`<span>segments: ${n}</span><span>transmissions: ${tx}</span><span>retransmissions: ${rt}</span><span>${ok?'delivered intact':'not delivered'}</span>`;return}var e=ev[k++],li=document.createElement('li');li.textContent=e[0];if(e[1])li.className=e[1];$('log').appendChild(li);$('log').scrollTop=$('log').scrollHeight;if(e[2]!==undefined)$('rx').textContent=e[2]},300)};var HF=[['Source port',16,'Identifies the sending application, usually a random port such as 52044.'],['Destination port',16,'Identifies the receiving application: 80 for HTTP, 443 for HTTPS, 22 for SSH.'],['Sequence number',32,'Number of the first data byte in this segment (or the starting number when SYN is set). It lets the receiver order data and spot gaps.'],['Acknowledgment number',32,'The next byte the sender expects to receive. Only valid when the ACK flag is set.'],['Data offset',4,'Header length in 32-bit words (5 to 15). It tells the receiver where the data starts.'],['Reserved',4,'Set to zero. Kept for future use.'],['Flags',8,'CWR and ECE signal congestion, URG marks urgent data, ACK means the ack number is valid, PSH asks to deliver now, RST resets the connection, SYN opens a connection, FIN closes one.'],['Window size',16,'How many more bytes the sender of this segment can receive. This is flow control.'],['Checksum',16,'Error check over the header, the data and a pseudo-header. A segment with a bad checksum is dropped.'],['Urgent pointer',16,'Offset to the end of urgent data. Only used when URG is set and rarely seen today.'],['Options',32,'Optional, up to 40 bytes: maximum segment size, window scaling, selective ACK, timestamps. Padded to a 32-bit boundary.','<br>0 to 40 bytes']];$('hd').innerHTML=HF.map(function(f,i){return `<button style='--b:${f[1]}' data-i='${i}' aria-pressed='false'>${f[0]}${f[3]||'<br>'+f[1]+' bits'}</button>`}).join('')+`<div class='dt'>Data (the application’s bytes)</div>`;$('hd').onclick=function(e){var b=e.target.closest('button');if(!b)return;var f=HF[b.getAttribute('data-i')];Array.prototype.forEach.call($('hd').querySelectorAll('button'),function(x){x.setAttribute('aria-pressed',x===b)});$('hi').innerHTML=`<b>${f[0]}</b> (${f[3]?'variable length':f[1]+' bits'}): ${f[2]}`};tabs();go();

(function(){var b=document.createElement('button');b.className='th';b.type='button';var root=document.documentElement;function cur(){return root.getAttribute('data-theme')||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light')}function lab(){b.textContent=cur()==='dark'?'Light mode':'Dark mode'}b.onclick=function(){root.setAttribute('data-theme',cur()==='dark'?'light':'dark');lab()};lab();$('nav').appendChild(b)})();

(function(){var bs=$('nav').querySelectorAll('button[data-t]');if(window.IntersectionObserver){var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting)Array.prototype.forEach.call(bs,function(b){b.setAttribute('aria-current',b.getAttribute('data-t')===e.target.id?'true':'false')})})},{rootMargin:'-20% 0px -70% 0px'});NV.forEach(function(a){io.observe($(a[0]))})}Array.prototype.forEach.call(document.querySelectorAll('.hero [data-t]'),function(b){b.onclick=function(){$(b.getAttribute('data-t')).scrollIntoView({behavior:reduce?'auto':'smooth'})}})})();