'use strict';
let sharedReady=false,sharedLoading=false,sharedFailure='',catalogVersion=0,remoteCatalog={customProducts:[],unavailable:[]},orderSubmitting=false,userStateLoaded=false,userStateSaving=false,userStateSaveQueued=false;
const originalRender=render;
const originalSave=save;
render=function(){originalRender();showSharedStatus()};
function userStatePayload(){return {profile:{name:state.profile?.name||'',email:signedInUser.email,phone:state.profile?.phone||''},favorites:[...(state.favorites||[])],addresses:[...(state.addresses||[])],activeOrderId:state.activeOrderId||null,discount:state.discount||null}}
function applyUserState(value){
 if(!value||typeof value!=='object')return;
 state.profile={...state.profile,...(value.profile||{}),email:signedInUser.email};
 state.favorites=Array.isArray(value.favorites)?value.favorites:[];
 state.addresses=Array.isArray(value.addresses)?value.addresses:[];
 state.activeOrderId=typeof value.activeOrderId==='string'?value.activeOrderId:state.activeOrderId;
 state.discount=value.discount==='DULCE10'?'DULCE10':null;
}
async function persistUserState(){
 if(role!=='user'||!userStateLoaded)return;
 if(userStateSaving){userStateSaveQueued=true;return}
 userStateSaving=true;
 try{const data=await shopAPI('/api/user-state',{method:'PUT',body:JSON.stringify(userStatePayload())});applyUserState(data.state)}
 catch(error){sharedFailure=error.message;showSharedStatus()}
 finally{userStateSaving=false;if(userStateSaveQueued){userStateSaveQueued=false;persistUserState()}}
}
save=function(){originalSave();if(role==='user'&&userStateLoaded)persistUserState()};
function loadGlobal(){const empty=defaultsGlobal();try{const previous=JSON.parse(localStorage.getItem(GLOBAL_STORE)||'{}');empty.supportTickets=Array.isArray(previous.supportTickets)?previous.supportTickets:[]}catch{}return empty}
function persistGlobalFromState(){try{const previous=JSON.parse(localStorage.getItem(GLOBAL_STORE)||'{}');previous.supportTickets=role==='administrator'?state.supportTickets:[...(previous.supportTickets||[]).filter(t=>(t.ownerEmail||t.email||'')!==activeUserEmail),...state.supportTickets];localStorage.setItem(GLOBAL_STORE,JSON.stringify(previous))}catch{}}
function syncFromStorage(){}
function safeLabel(value){return escapeDessertText(value)}
async function shopAPI(path,options={}){
 const result=await fetch(path,{credentials:'same-origin',cache:'no-store',...options,headers:{'Content-Type':'application/json',...(options.headers||{})}});
 let data;try{data=await result.json()}catch{throw new Error('No pudimos conectar con Al Horno. Reintenta en unos momentos.')}
 if(!result.ok)throw Object.assign(new Error(data.error||'No se pudo completar la operación'),{status:result.status});return data;
}
function showSharedStatus(){
 let el=document.getElementById('shared-status');if(!el){el=document.createElement('div');el.id='shared-status';el.className='wrap';el.setAttribute('role','status');document.getElementById('app').before(el)}
 el.innerHTML=sharedFailure?`<div class="dessert-price-note">${safeLabel(sharedFailure)} <button class="soft" onclick="refreshSharedOrders(true)">Reintentar</button></div>`:(!sharedReady?'<p>Conectando con los pedidos de Al Horno…</p>':'');
}
function applyCatalog(value){remoteCatalog={customProducts:value.customProducts,unavailable:value.unavailable};catalogVersion=value.version;state.customProducts=value.customProducts.map(p=>({...p,name:safeLabel(p.name),cat:safeLabel(p.cat),desc:safeLabel(p.desc),tag:safeLabel(p.tag||''),img:safeLabel(p.img)}));state.unavailable=[...value.unavailable]}
async function refreshSharedOrders(force=false){
 if(sharedLoading||!role)return;sharedLoading=true;
 try{
  const requests=[shopAPI('/api/catalog'),shopAPI('/api/orders')];if(role==='user'&&!userStateLoaded)requests.push(shopAPI('/api/user-state'));const [catalog,data,userData]=await Promise.all(requests);
  const changed=JSON.stringify(state.orders)!==JSON.stringify(data.orders)||catalog.version!==catalogVersion||!sharedReady;
  applyCatalog(catalog);state.orders=data.orders;if(role==='user'&&!userStateLoaded){if(userData?.state)applyUserState(userData.state);userStateLoaded=true;if(!userData?.state)await persistUserState()}sharedReady=true;sharedFailure='';
  const editing=['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName);
  if(changed&&!editing&&['admin','adminOrders','orders','tracking','menu','home'].includes(view))render();else showSharedStatus();
 }catch(error){sharedFailure=error.message;showSharedStatus()}finally{sharedLoading=false}
}
function initializeSharedOrders(){refreshSharedOrders(true);setInterval(()=>{if(!document.hidden)refreshSharedOrders()},8000);window.addEventListener('focus',()=>refreshSharedOrders())}
function paymentFields(){return '<p class="meta">El negocio confirmará la forma de pago. Esta página no realiza cobros automáticos ni solicita datos de tarjeta.</p>'}
function orderPayload(){
 const value=id=>(document.getElementById(id)?.value||'').trim();
 if(!state.cart.length)throw new Error('Agrega un postre al carrito');
 const data={name:value('ckName'),phone:value('ckPhone'),address:value('ckAddress'),district:value('ckDistrict'),notes:value('ckNotes'),terms:!!document.getElementById('terms')?.checked,payment:pay,discount:state.discount,items:state.cart.map(i=>({id:i.id,qty:i.qty,expectedPrice:getProduct(i.id)?.price,options:dessertOptions(i)}))};
 if(!data.name||!data.phone||!data.address||!data.district)throw new Error('Completa nombre, teléfono, dirección y barrio');if(!data.terms)throw new Error('Acepta los términos para continuar');return data;
}
function pendingOrderKey(data){
 const fingerprint=JSON.stringify(data),key='alHornoPending:'+signedInUser.id;
 try{const old=JSON.parse(localStorage.getItem(key)||'null');if(old?.fingerprint===fingerprint)return old.requestKey;const requestKey=crypto.randomUUID();localStorage.setItem(key,JSON.stringify({fingerprint,requestKey}));return requestKey}catch{return crypto.randomUUID()}
}
async function placeOrder(withWhatsApp=false){
 if(orderSubmitting)return;let data;try{data=orderPayload()}catch(error){toast(error.message);return}
 if(!sharedReady){toast('Espera a que conectemos con los pedidos antes de confirmar');refreshSharedOrders(true);return}
 orderSubmitting=true;const snapshot=JSON.stringify(state.cart);document.querySelectorAll('[data-order-submit]').forEach(b=>{b.disabled=true;b.textContent='Guardando pedido…'});
 try{
  const result=await shopAPI('/api/orders',{method:'POST',body:JSON.stringify({...data,requestKey:pendingOrderKey(data)})});
  state.orders=[result.order,...state.orders.filter(o=>o.id!==result.order.id)];state.activeOrderId=result.order.id;
  if(JSON.stringify(state.cart)===snapshot)state.cart=[];
  state.profile={...state.profile,name:data.name,phone:data.phone,email:signedInUser.email};save();try{localStorage.removeItem('alHornoPending:'+signedInUser.id)}catch{}sharedFailure='';view='tracking';render();
  if(withWhatsApp)window.location.assign(savedOrderWhatsAppURL(result.order));else toast('Pedido guardado. El negocio ya puede verlo.');
 }catch(error){sharedFailure=error.message;showSharedStatus();toast(error.message);document.querySelectorAll('[data-order-submit]').forEach(b=>{b.disabled=false;b.textContent=b.dataset.orderSubmit})}finally{orderSubmitting=false}
}
function savedOrderWhatsAppURL(o){const lines=[`Hola, Al Horno. Pedido ${o.id}:`,'',...o.items.map(i=>`${i.qty} × ${i.name} · ${fmt(i.price*i.qty)}\n${dessertDetailLines(i).join('\n')}`),'',`Subtotal: ${fmt(o.sub)}`,`Descuento: -${fmt(o.disc)}`,`Domicilio: ${fmt(o.delivery)}`,`${o.awaitingQuote?'Total base':'Total'}: ${fmt(o.total)} COP`,...(o.awaitingQuote?['Adicionales por confirmar; no están incluidos en el total base.']:[]),'',`Nombre: ${o.name}`,`Teléfono: ${o.phone}`,`Dirección: ${o.address}`,`Barrio: ${o.district}`,`Indicaciones: ${o.notes||'Ninguna'}`,`Método solicitado: ${o.payment}`,'El pedido ya está registrado en Al Horno. Por favor confirma disponibilidad y entrega.'];return 'https://wa.me/573222798084?text='+encodeURIComponent(lines.join('\n'))}
function sharedOrderDetails(o){return o.items.map(i=>`<div class="dessert-order-line"><b>${i.qty} × ${safeLabel(i.name)}</b><div>${fmt(i.price*i.qty)}</div>${dessertDetailsHTML(i)}</div>`).join('')+dessertPriceNotice(o.items)}
function orderAvailability(){return sharedReady?'':'<div class="panel">'+(sharedFailure?'No se pudieron consultar los pedidos. Usa Reintentar para volver a conectar.':'Consultando pedidos…')+'</div>'}
function orders(){return `<section class="section wrap"><div class="head"><h2>Mis pedidos</h2></div>${orderAvailability()}${sharedReady&&!state.orders.length?'<div class="panel">Todavía no tienes pedidos registrados. Los nuevos pedidos aparecerán aquí en todos tus dispositivos.</div>':''}${state.orders.map(o=>`<article class="panel orderCard"><span class="status">${safeLabel(statusName(o.status))}</span><h3 style="overflow-wrap:anywhere">${safeLabel(o.id)}</h3><p>${new Date(o.created).toLocaleString('es-CO')} · ${safeLabel(o.payment)}</p><b>${o.awaitingQuote?'Total base':'Total'}: ${fmt(o.total)}</b>${sharedOrderDetails(o)}<button class="soft" onclick="track('${o.id}')">Ver seguimiento</button><button class="ghost" onclick="repeatOrder('${o.id}')">Repetir pedido</button></article>`).join('')}</section>`}
function tracking(){const o=getActive();if(!o)return `<section class="section wrap">${orderAvailability()||'<div class="panel">No tienes un pedido activo. <button class="primary" onclick="go(\'menu\')">Ver postres</button></div>'}</section>`;return `<section class="section wrap"><div class="panel"><span class="status">${safeLabel(statusName(o.status))}</span><h2 style="overflow-wrap:anywhere">Pedido ${safeLabel(o.id)}</h2><p>Tu pedido está registrado en Al Horno. Las actualizaciones del negocio se consultan automáticamente.</p>${o.etaText?`<p><b>Entrega: ${safeLabel(o.etaText)}</b></p>`:''}<div class="timeline">${statusNames.map((label,i)=>`<div class="step ${i<o.status?'done':i===o.status?'current':''}"><div class="circle">${i+1}</div><b>${safeLabel(label)}</b></div>`).join('')}</div>${o.adminNote?`<p class="dessert-price-note">${safeLabel(o.adminNote)}</p>`:''}</div><div class="trackGrid" style="margin-top:18px"><div class="panel"><h3>Tu pedido</h3>${sharedOrderDetails(o)}<b>${o.awaitingQuote?'Total base':'Total'}: ${fmt(o.total)}</b></div><div class="panel"><h3>Domicilio</h3><p>${safeLabel(o.name)}<br>${safeLabel(o.address)}<br>${safeLabel(o.district)}<br>${safeLabel(o.phone)}</p><p>${safeLabel(o.notes)}</p><p>Pago: ${safeLabel(o.payment)}</p><a class="primary wide" style="display:block;text-align:center;text-decoration:none" href="${safeLabel(savedOrderWhatsAppURL(o))}" target="_blank" rel="noopener noreferrer">Enviar por WhatsApp</a><button class="soft wide" style="margin-top:10px" onclick="go('orders')">Ver mis pedidos</button></div></div></section>`}
function adminOrders(){return `<section class="section wrap"><div class="head"><div><div class="kicker">Administración</div><h2>Pedidos de todos los clientes</h2></div><button class="soft" onclick="refreshSharedOrders(true)">Actualizar</button></div>${orderAvailability()}${sharedReady&&!state.orders.length?'<div class="panel">Aún no hay pedidos registrados.</div>':''}${state.orders.map(o=>`<article class="panel orderCard"><span class="status">${safeLabel(statusName(o.status))}</span><h3 style="overflow-wrap:anywhere">${safeLabel(o.id)}</h3><p><b>${safeLabel(o.name)}</b> · ${safeLabel(o.phone)}<br>${safeLabel(o.address)} · ${safeLabel(o.district)}<br>${safeLabel(o.email)}</p><p>Indicaciones: ${safeLabel(o.notes||'Ninguna')}</p>${sharedOrderDetails(o)}<p><b>${o.awaitingQuote?'Total base':'Total'}: ${fmt(o.total)}</b> · ${safeLabel(o.payment)}</p><label class="field">Estado<select id="status-${o.id}">${statusNames.map((s,i)=>`<option value="${i}" ${i===o.status?'selected':''}>${safeLabel(s)}</option>`).join('')}</select></label><label class="field">Tiempo estimado<input id="eta-${o.id}" value="${safeLabel(o.etaText||'')}"></label><label class="field">Mensaje para el cliente<textarea id="note-${o.id}">${safeLabel(o.adminNote||'')}</textarea></label><button class="primary" onclick="saveOrderReport('${o.id}')">Guardar actualización</button></article>`).join('')}</section>`}
const updatingOrders=new Set();
async function saveOrderReport(id){if(updatingOrders.has(id))return;const o=state.orders.find(o=>o.id===id);if(!o)return;updatingOrders.add(id);try{const data=await shopAPI('/api/orders/'+encodeURIComponent(id),{method:'PATCH',body:JSON.stringify({version:o.version,status:Number(document.getElementById('status-'+id).value),etaText:document.getElementById('eta-'+id).value,adminNote:document.getElementById('note-'+id).value})});state.orders=state.orders.map(x=>x.id===id?data.order:x);sharedFailure='';render();toast('Actualización guardada para el cliente')}catch(error){sharedFailure=error.message;showSharedStatus();if(error.status===409)await refreshSharedOrders(true)}finally{updatingOrders.delete(id)}}
async function publishCatalog(next){try{const data=await shopAPI('/api/catalog',{method:'PUT',body:JSON.stringify({...next,version:catalogVersion})});applyCatalog(data);sharedFailure='';render();toast('Catálogo actualizado para todos los clientes')}catch(error){sharedFailure=error.message;showSharedStatus();if(error.status===409)await refreshSharedOrders(true)}}
function toggleAvailability(id){const next={customProducts:remoteCatalog.customProducts,unavailable:remoteCatalog.unavailable.includes(id)?remoteCatalog.unavailable.filter(x=>x!==id):[...remoteCatalog.unavailable,id]};return publishCatalog(next)}
function createProduct(){const value=id=>(document.getElementById(id)?.value||'').trim();const p={id:'custom-'+crypto.randomUUID(),name:value('apName'),cat:value('apCat'),price:Number(value('apPrice')),desc:value('apDesc'),img:value('apImg')||photo('photo-1551024506-0bccd828d307'),tag:value('apTag')};return publishCatalog({customProducts:[p,...remoteCatalog.customProducts],unavailable:remoteCatalog.unavailable})}
function deleteProduct(id){if(confirm('¿Eliminar este producto del catálogo compartido?'))return publishCatalog({customProducts:remoteCatalog.customProducts.filter(p=>p.id!==id),unavailable:remoteCatalog.unavailable.filter(x=>x!==id)})}
