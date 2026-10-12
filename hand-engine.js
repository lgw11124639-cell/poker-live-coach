/* Poker Live Coach — hand engine v1; local-only data */
(function(){
const fmt=n=>Math.round(n||0).toLocaleString('ko-KR');
const live=()=>state.players.filter(p=>!p.folded&&p.stack+p.contributed>0);
const eligible=()=>state.players.filter(p=>!p.folded&&(p.stack>0||p.contributed>0));
const get=n=>state.players.find(p=>p.seat===n);
const seatNext=(n,arr)=>{for(let i=1;i<=10;i++){let v=(n+i-1)%10+1;if(arr.some(p=>p.seat===v))return v}return n};
const isAll=p=>p.stack<=0;
function mark(p){p.contributed??=0;p.roundPaid??=0;p.acted??=false;p.cards??=[]}
function initHand(first=false){
 const at=state.players.filter(p=>p.stack>0);if(at.length<2){state.paused='인원 부족';render();return}
 if(!first)state.button=seatNext(state.button,at);
 state.players.forEach(p=>{p.mucked=false;p.folded=p.stack<=0;p.contributed=0;p.roundPaid=0;p.acted=false;p.cards=[]});
 state.pot=0;state.street='PREFLOP';state.cards={hero:[],board:[]};state.amount=0;
 const sb=at.length===2?state.button:seatNext(state.button,at);
 const bb=seatNext(sb,at);
 const post=(seat,amt)=>{const p=get(seat);const paid=Math.min(p.stack,amt);p.stack-=paid;p.roundPaid+=paid;p.contributed+=paid;state.pot+=paid};
 post(sb,state.sb);post(bb,state.bb);
 if(state.level>=3&&state.gameType==='새틀라이트'){const p=get(bb);const ante=Math.min(p.stack,state.bb);p.stack-=ante;p.contributed+=ante;state.pot+=ante}
 state.currentBet=Math.max(get(bb).roundPaid,get(sb).roundPaid);
 state.lastRaise=state.bb;state.actions=0;
 state.selected=at.length===2?sb:seatNext(bb,at);
 resetActionToFirst();state.history.unshift('#'+state.hand+' 핸드 시작 '+fmt(state.sb)+'/'+fmt(state.bb));
 render();
}
prepareHand=initHand;
function firstToAct(){
 const players=eligible().filter(p=>p.stack>0);
 if(!players.length)return 0;
 const at=state.players.filter(p=>!p.folded&&(p.stack>0||(p.contributed||0)>0));
 if(state.street!=='PREFLOP')return seatNext(state.button,players);
 const sb=at.length===2?state.button:seatNext(state.button,at);
 const bb=seatNext(sb,at);
 return at.length===2?(players.some(p=>p.seat===sb)?sb:seatNext(sb,players)):seatNext(bb,players)
}
function resetActionToFirst(){
 if(state.street==='PREFLOP'&&state.actions===0&&!state.paused){const n=firstToAct();if(n)state.selected=n}
}
window.plcResetToUTG=resetActionToFirst;
function nextActor(from){
 const act=eligible().filter(p=>p.stack>0&&(!p.acted||p.roundPaid<state.currentBet));
 if(!act.length)return 0;
 return seatNext(from,act)
}
function streetDone(){
 const can=eligible().filter(p=>p.stack>0);
 return can.every(p=>p.acted&&p.roundPaid>=state.currentBet)
}
function streetNext(){
 if(state.paused==='showdown'){alert('쇼다운 대기 중입니다.');return}
 const streets=['PREFLOP','FLOP','TURN','RIVER'];
 if(state.street==='RIVER'||eligible().filter(p=>p.stack>0).length<=1){
   state.paused='showdown';state.history.unshift('쇼다운 · 카드 공개 또는 먹 선택');render();showShowdownEntry();return
 }
 state.street=streets[streets.indexOf(state.street)+1];
 state.currentBet=0;state.actions=0;state.lastRaise=state.bb;
 state.players.forEach(p=>{p.roundPaid=0;p.acted=false});
 const act=eligible().filter(p=>p.stack>0);
 state.selected=act.length?seatNext(state.button,act):state.button;
 state.history.unshift(state.street+' 시작');state.boardEntryRequired=true;render();if(state.street!=='PREFLOP'){try{openPicker('board')}catch(err){alert('보드 선택창 오류: '+err.message)}}
}
function act(kind){
 if(state.paused)return;
 const needed=state.street==='FLOP'?3:state.street==='TURN'?4:state.street==='RIVER'?5:0;
 if(needed&&(state.cards.board||[]).length<needed){openPicker('board');return}
 const p=get(state.selected);if(!p||p.folded||p.stack<=0)return;mark(p);
 const due=Math.max(0,state.currentBet-p.roundPaid);
 if(kind==='FOLD'){p.folded=true;p.folds++;p.acted=true;state.history.unshift(p.seat+'번 폴드')}
 else if(kind==='CHECK'){if(due){alert('콜 '+fmt(due)+'칩이 필요합니다.');return}p.acted=true;state.history.unshift(p.seat+'번 체크')}
 else{
  const target=Number(state.amount)||0;
  const amount=kind==='CALL'?Math.min(due,p.stack):kind==='ALL-IN'?p.stack:kind==='RAISE'?Math.min(p.stack,Math.max(0,target-p.roundPaid)):0;
  if(kind==='CALL'&&!due){alert('콜 금액이 없습니다. 체크를 누르세요.');return}
  if(kind==='RAISE'){
   if(target<=state.currentBet){alert('현재 베팅 '+fmt(state.currentBet)+'칩보다 높은 총 베팅액을 선택하세요.');return}
   const minRaise=state.currentBet===0?state.bb:state.lastRaise;
   const raiseBy=p.roundPaid+amount-state.currentBet;
   if(raiseBy<minRaise&&amount<p.stack){alert('최소 추가 레이즈 '+fmt(minRaise)+'칩이 필요합니다.');return}
  }
  if(amount<=0){alert('칩 금액을 선택하세요.');return}
  p.stack-=amount;p.contributed+=amount;p.roundPaid+=amount;state.pot+=amount;
  if(p.roundPaid>state.currentBet){
   const jump=p.roundPaid-state.currentBet,full=jump>=state.lastRaise;
   state.currentBet=p.roundPaid;
   if(full){state.lastRaise=jump;state.players.filter(q=>q.seat!==p.seat&&!q.folded&&q.stack>0).forEach(q=>q.acted=false)}
   p.raises++
  }else if(kind==='CALL')p.calls++;
  p.acted=true;state.history.unshift(p.seat+'번 '+kind+' '+fmt(p.roundPaid)+'칩 (이번 추가 '+fmt(amount)+')');state.amount=0
 }
 state.actions=(state.actions||0)+1;
 const remaining=eligible();
 if(remaining.length===1){finish(remaining[0].seat);return}
 if(streetDone())streetNext();
 else{const nxt=nextActor(state.selected);if(nxt)state.selected=nxt;else state.paused='showdown'}
 render()
}
betAction=act;fold=()=>act('FOLD');
function parseCards(x){if(!x)return[];return x.trim().toUpperCase().replace(/10/g,'T').split(/[\s,;]+/).filter(Boolean).map(c=>{let m=c.match(/^([2-9TJQKA])([CDHS♣♦♥♠])$/);if(!m)throw Error('카드는 As Kh Qd 형식으로 입력해주세요');return m[1]+({'♣':'C','♦':'D','♥':'H','♠':'S'}[m[2]]||m[2])})}
function score5(cs){
const val='23456789TJQKA';const v=cs.map(c=>val.indexOf(c[0])+2).sort((a,b)=>b-a);
const counts={};v.forEach(x=>counts[x]=(counts[x]||0)+1);
const groups=Object.keys(counts).map(Number).sort((a,b)=>counts[b]-counts[a]||b-a);
const flush=cs.every(c=>c[1]===cs[0][1]);
const uniq=[...new Set(v)];if(uniq.includes(14))uniq.push(1);
let straight=0;for(let i=0;i<=uniq.length-5;i++)if(uniq[i]-uniq[i+4]===4){straight=uniq[i];break}
let out;if(straight&&flush)out=[8,straight];else if(counts[groups[0]]===4)out=[7,groups[0],...v.filter(x=>x!==groups[0])];else if(counts[groups[0]]===3&&counts[groups[1]]>=2)out=[6,groups[0],groups[1]];else if(flush)out=[5,...v];else if(straight)out=[4,straight];else if(counts[groups[0]]===3)out=[3,groups[0],...v.filter(x=>x!==groups[0])];else if(counts[groups[0]]===2&&counts[groups[1]]===2)out=[2,Math.max(groups[0],groups[1]),Math.min(groups[0],groups[1]),...v.filter(x=>x!==groups[0]&&x!==groups[1])];else if(counts[groups[0]]===2)out=[1,groups[0],...v.filter(x=>x!==groups[0])];else out=[0,...v];return out
}
function handScore(cards){if(cards.length!==7)throw Error('홀 카드 2장과 보드 5장이 필요합니다');let best=null;for(let a=0;a<7;a++)for(let b=a+1;b<7;b++){let rank=score5(cards.filter((_,i)=>i!==a&&i!==b));if(!best||compare(rank,best)>0)best=rank}return best}
function compare(a,b){for(let i=0;i<Math.max(a.length,b.length);i++){let d=(a[i]||0)-(b[i]||0);if(d)return d}return 0}
let picker=null;
const deckRanks='AKQJT98765432',deckSuits=['S','H','D','C'];
const displayCard=c=>c?c[0]+({S:'♠',H:'♥',D:'♦',C:'♣'}[c[1]]||''):'';
function openPicker(type){const p=get(state.selected);if(type==='hole'&&!p)return;picker={type,seat:state.selected,selected:[...(type==='board'?(state.cards.board||[]):(p.cards||[]))]};showPicker()}
function showPicker(){
 if(!picker)return;document.getElementById('plc-card-picker')?.remove();
 const max=picker.type==='board'?(state.street==='FLOP'?3:state.street==='TURN'?4:5):2;
 const used=new Set(picker.type==='board'?state.players.flatMap(p=>p.cards||[]):[...(state.cards.board||[]),...state.players.filter(p=>p.seat!==picker.seat).flatMap(p=>p.cards||[])]);
 const d=document.createElement('div');d.id='plc-card-picker';d.style.cssText='position:fixed;inset:0;z-index:9999;background:#080d18ee;display:flex;align-items:center;justify-content:center;padding:12px';
 const container=document.createElement('div');container.style.cssText='background:#152137;color:#fff;border:1px solid #3e5270;border-radius:18px;padding:14px;width:min(100%,560px);max-height:94dvh;overflow:auto';
 const title=document.createElement('h3');title.textContent=(picker.type==='board'?(state.street==='FLOP'?'플랍 3장':state.street==='TURN'?'턴 1장 추가':state.street==='RIVER'?'리버 1장 추가':'커뮤니티 카드'):'좌석 '+picker.seat+' 홀 카드')+' · '+picker.selected.length+'/'+max;container.append(title);
 const chosen=document.createElement('div');chosen.style.cssText='min-height:40px;margin-bottom:12px;color:#eaca81';chosen.textContent=picker.selected.map(displayCard).join('  ')||'아래에서 카드를 선택하세요';container.append(chosen);
 for(const suit of deckSuits){const row=document.createElement('div');row.style.cssText='display:grid;grid-template-columns:repeat(13,minmax(0,1fr));gap:3px;margin-bottom:9px';
 for(const rank of deckRanks){const card=rank+suit;const b=document.createElement('button');b.textContent=rank+({S:'♠',H:'♥',D:'♦',C:'♣'}[suit]);b.style.cssText='padding:8px 0;border-radius:6px;font-size:12px;min-width:0;background:'+(['H','D'].includes(suit)?'#fff4f4':'#fff')+';color:'+(['H','D'].includes(suit)?'#b01835':'#1c2234');const selected=picker.selected.includes(card);if(selected)b.style.outline='3px solid #e1b965';b.disabled=used.has(card)||(!selected&&picker.selected.length>=max);b.onclick=()=>{picker.selected=selected?picker.selected.filter(c=>c!==card):[...picker.selected,card];showPicker()};row.append(b)}container.append(row)}
 const actions=document.createElement('div');actions.style.cssText='display:flex;gap:8px;margin-top:12px';
 const cancel=document.createElement('button');cancel.textContent='취소';cancel.style.flex='1';cancel.onclick=()=>{picker=null;d.remove()};
 const clear=document.createElement('button');clear.textContent='초기화';clear.style.flex='1';clear.onclick=()=>{picker.selected=[];showPicker()};
 const save=document.createElement('button');save.textContent='저장';save.style.cssText='flex:1;background:#d9b971;color:#15151a';save.disabled=picker.selected.length!==max;save.onclick=()=>{if(picker.type==='board')state.cards.board=[...picker.selected];else get(picker.seat).cards=[...picker.selected];const type=picker.type;if(type==='board')state.boardEntryRequired=false;picker=null;d.remove();if(type==='hole'&&state.street==='PREFLOP'&&state.actions===0)resetActionToFirst();render();if(type==='hole'&&state.paused==='showdown')showShowdownEntry()};
 actions.append(cancel,clear,save);container.append(actions);d.append(container);document.body.append(d)
}
function inputBoard(){openPicker('board')}window.plcInputBoard=inputBoard;
function inputHole(){openPicker('hole')}
function heroHole(){if(!state.heroSeat)return;state.selected=state.heroSeat;render();openPicker('hole')}
window.plcHeroHole=heroHole;
function showShowdownEntry(){
 document.getElementById('plc-showdown-entry')?.remove();
 if(state.paused!=='showdown')return;
 const d=document.createElement('div');d.id='plc-showdown-entry';
 d.style.cssText='position:fixed;inset:0;z-index:9000;background:#07101bee;display:flex;align-items:center;justify-content:center;padding:12px';
 const panel=document.createElement('div');panel.style.cssText='width:min(100%,520px);max-height:90dvh;overflow:auto;border-radius:18px;padding:16px;background:#152137;color:#fff';
 const title=document.createElement('h2');title.textContent='🃏 쇼다운 · 카드 공개 / 먹';panel.append(title);
 const info=document.createElement('p');info.textContent='카드를 보여준 플레이어는 카드 입력, 패배하여 공개하지 않은 플레이어는 먹(Muck). 승자 확인 후 정산하세요.';info.style.cssText='font-size:13px;color:#c4cedb';panel.append(info);
 for(const p of eligible()){
  const row=document.createElement('div');row.style.cssText='display:flex;align-items:center;gap:8px;justify-content:space-between;border-top:1px solid #36465b;padding:11px 0';
  const label=document.createElement('span');label.textContent=p.seat+'번 '+(p.seat===state.heroSeat?'ME ':'')+(p.mucked?'먹(Muck)':(p.cards||[]).length===2?p.cards.map(displayCard).join(' '):'미공개');
  label.style.cssText='font-weight:700;font-size:13px';row.append(label);
  const reveal=document.createElement('button');reveal.textContent='카드 공개';reveal.style.cssText='padding:9px;font-size:12px;background:#d9b971;color:#171a22';
  reveal.onclick=()=>{p.mucked=false;state.selected=p.seat;d.remove();openPicker('hole')};
  const muck=document.createElement('button');muck.textContent=p.mucked?'먹 취소':'먹(Muck)';muck.style.cssText='padding:9px;font-size:12px;background:#38475d;color:white';
  muck.onclick=()=>{if(!p.mucked&&eligible().filter(x=>!x.mucked).length===1){alert('마지막 승리 가능 플레이어는 먹 처리할 수 없습니다.');return}p.mucked=!p.mucked;render();showShowdownEntry()};
  row.append(reveal,muck);panel.append(row)
 }
 const settle=document.createElement('button');settle.textContent='✓ 쇼다운 정산 → 다음 핸드';
 settle.style.cssText='width:100%;padding:15px;margin-top:12px;background:#d9b971;color:#15161c;font-weight:900';
 settle.onclick=()=>{const old=state.hand;showdown();if(state.hand!==old||state.paused!=='showdown')d.remove()};
 panel.append(settle);
 const later=document.createElement('button');later.textContent='나중에 입력';later.style.cssText='width:100%;padding:10px;margin-top:7px';later.onclick=()=>d.remove();panel.append(later);
 d.append(panel);document.body.append(d)
}
window.plcShowdownEntry=showShowdownEntry;
function showdown(){
const players=eligible().filter(p=>!p.mucked);
if(!players.length){alert('승리할 플레이어가 없습니다. 먹 처리 상태를 확인하세요.');return}
if((state.cards.board||[]).length!==5||(players.length>1&&players.some(p=>(p.cards||[]).length!==2))){alert('쇼다운 참여자의 공개 카드 2장과 보드 5장이 필요합니다. 먹한 플레이어 카드는 필요하지 않습니다.');return}
const all=[...state.cards.board,...players.flatMap(p=>p.cards)];if(new Set(all).size!==all.length){alert('중복된 카드가 있습니다. 다시 확인하세요.');return}
const levels=[...new Set(state.players.map(p=>p.contributed||0).filter(x=>x>0))].sort((a,b)=>a-b);let prev=0;const award={};
for(const limit of levels){const contributors=state.players.filter(p=>(p.contributed||0)>=limit),pool=(limit-prev)*contributors.length;prev=limit;
const cand=contributors.filter(p=>!p.folded&&!p.mucked);if(!cand.length){alert('팟 정산 실패: 유효한 승자가 없습니다.');return}
let best=null,winners=[];for(const p of cand){const rank=cand.length===1?[0]:handScore([...p.cards,...state.cards.board]);if(!best||compare(rank,best)>0){best=rank;winners=[p]}else if(compare(rank,best)===0)winners.push(p)}
const slice=Math.floor(pool/winners.length);let extra=pool%winners.length;for(const p of winners.sort((a,b)=>a.seat-b.seat)){award[p.seat]=(award[p.seat]||0)+slice+(extra-->0?1:0)}
}
if(Object.values(award).reduce((a,b)=>a+b,0)!==state.pot){alert('팟 금액 검증 실패. 핸드 정산을 중단합니다.');return}
for(const [k,v] of Object.entries(award))get(Number(k)).stack+=v;
state.history.unshift('쇼다운: '+Object.entries(award).map(([k,v])=>k+'번 +'+fmt(v)).join(' / '));
state.games.unshift({at:new Date().toLocaleString('ko-KR'),hand:state.hand,winner:Object.keys(award).join(','),pot:state.pot,mode:state.mode,blind:state.sb+'/'+state.bb});
state.games=state.games.slice(0,100);state.pot=0;
if(state.gameType==='새틀라이트'&&[11,19,25].includes(state.pendingLevel)){state.paused='break';state.washQueued=true;state.washTarget=state.pendingLevel===11?[100,500]:state.pendingLevel===19?[1000]:[5000];if(state.pendingLevel===11)state.registrationOpen=false}
else if(state.breakQueued){state.paused='break';state.breakQueued=false}
else{applyPending();state.hand++;prepareHand();if(!state.paused&&state.heroSeat&&get(state.heroSeat)?.stack>0)heroHole();return}
render()
}
const baseGame=game;
game=function(){
let html=baseGame();if(!state.players.length)return html;
const p=get(state.selected),due=p?Math.max(0,(state.currentBet||0)-(p.roundPaid||0)):0;
const widget='<div class="panel"><div class="between"><b>핸드 진행 · 쇼다운</b><span class="pill">'+E(state.street)+'</span></div><p class="small">선택 좌석 '+state.selected+'번 · 필요한 콜 <b>'+fmt(due)+'</b>칩 · 현재 베팅 '+fmt(state.currentBet||0)+'칩</p><p class="small muted">보드: '+E((state.cards.board||[]).join(' ')||'미입력')+' · 홀카드: '+E((p?.cards||[]).join(' ')||'미입력')+'</p><div class="grid2"><button onclick="plcInputHole()">선택 좌석 카드 입력</button><button onclick="plcInputBoard()">보드 입력</button><button class="primary" onclick="plcShowdown()">쇼다운 자동 판정</button><button onclick="plcNextStreet()">다음 스트리트</button></div><p class="tiny muted">카드가 불완전하면 임의로 승자를 결정하지 않습니다. 전체 베팅·사이드팟은 실제 경기 사용 전 검증이 필요합니다.</p></div>';
return html.replace('<div class="panel"><b>최근 액션</b>',widget+'<div class="panel"><b>최근 액션</b>');
};
function manualNextHand(){
 const players=state.players.filter(p=>!p.folded&&(p.contributed||0)>0);
 if(state.paused==='break'||state.paused==='wash'){alert('브레이크 또는 워싱을 완료한 뒤 다음 핸드로 진행하세요.');return}
 if(!state.players.length)return;
 if(state.pot>0){
   if(players.length===1){finish(players[0].seat);return}
   const allIn=players.some(p=>p.stack===0);
   const different=players.some(p=>(p.contributed||0)!==(players[0]?.contributed||0));
   if(allIn){alert('올인 상황은 수동 승자 지정을 차단합니다. 카드를 입력하고 쇼다운으로 정산하세요.');return}
   const choice=prompt('다음 핸드 진행: 현재 팟 '+fmt(state.pot)+'칩을 받을 승자 좌석 번호를 입력하세요. (취소하면 유지)');
   if(choice===null)return;
   const n=Number(choice);const winner=players.find(p=>p.seat===n);
   if(!winner){alert('현재 핸드에 남아 있는 참가 좌석 번호를 입력하세요.');return}
   if(!confirm(n+'번에게 팟 '+fmt(state.pot)+'칩을 지급하고 다음 핸드로 진행할까요? 미콜 금액이 남았다면 먼저 확인하세요.'))return;
   finish(n);return
 }
 if(!confirm('팟이 0칩입니다. 새 핸드를 시작할까요?'))return;
 state.paused='';applyPending();state.hand++;prepareHand();render()
}
window.plcOpenBoard=inputBoard;window.plcInputHole=inputHole;window.plcManualNextHand=manualNextHand;window.plcInputBoard=inputBoard;window.plcShowdown=showdown;window.plcNextStreet=()=>{streetNext();render()};
})();
