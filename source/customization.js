'use strict';
const DESSERT_TOPPINGS=[{id:'chocolate',label:'Chocolate'},{id:'arequipe',label:'Arequipe'},{id:'oreo',label:'Oreo'},{id:'fresas',label:'Fresas'},{id:'helado',label:'Helado de vainilla'}];
let dessertEditing=null;
function escapeDessertText(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function dessertSizes(product){return product&&['Combos','Cupcakes','Donuts','Galletas'].includes(product.cat)?[{id:'original',label:'Presentación original'},{id:'grande',label:'Más porciones'}]:[{id:'original',label:'Regular'},{id:'grande',label:'Grande'}]}
function dessertOptions(item){const o=item.options||{};return {size:o.size==='grande'?'grande':'original',toppings:[...new Set(Array.isArray(o.toppings)?o.toppings:[])].filter(id=>DESSERT_TOPPINGS.some(t=>t.id===id)).sort(),notes:typeof o.notes==='string'?o.notes.trim().slice(0,300):''}}
function dessertSignature(item){return JSON.stringify([item.id,dessertOptions(item)])}
function hasDessertExtras(items=state.cart){return items.some(i=>{const o=dessertOptions(i);return o.size!=='original'||o.toppings.length>0})}
function dessertPriceLabel(items=state.cart){return hasDessertExtras(items)?'Total base':'Total'}
function dessertPriceNotice(items=state.cart){return hasDessertExtras(items)?'<p class="dessert-price-note">El total base no incluye tamaños especiales ni toppings. Su precio y disponibilidad se confirman por WhatsApp antes de aceptar el pedido.</p>':''}
function dessertDetailLines(item){const o=dessertOptions(item),p=getProduct(item.id);return [`Tamaño: ${dessertSizes(p).find(s=>s.id===o.size).label}`,`Toppings: ${o.toppings.length?o.toppings.map(id=>DESSERT_TOPPINGS.find(t=>t.id===id).label).join(', '):'Sin adicionales'}`,...(o.notes?[`Notas: ${o.notes}`]:[])]}
function dessertDetailsHTML(item){return `<div class="dessert-details">${dessertDetailLines(item).map(line=>`<div>${escapeDessertText(line)}</div>`).join('')}</div>`}
function dessertOrderLines(items){return items.map(i=>`<div class="dessert-order-line"><b>${i.qty} × ${escapeDessertText(getProduct(i.id)?.name||'Postre')}</b>${dessertDetailsHTML(i)}</div>`).join('')}
function cloneDessertItem(item){return {...item,options:dessertOptions(item)}}
function commitDessertOptions(id,options,quantity,editIndex=null){
  if(!getProduct(id)||isUnavailable(id))throw new Error('Este postre ya no está disponible.');
  if(!Number.isInteger(quantity)||quantity<1||quantity>99)throw new Error('Elige entre 1 y 99 unidades.');
  if(!options||!['original','grande'].includes(options.size)||!Array.isArray(options.toppings)||options.toppings.some(id=>!DESSERT_TOPPINGS.some(t=>t.id===id))||typeof options.notes!=='string'||options.notes.length>300)throw new Error('Revisa las opciones del postre.');
  if(editIndex!==null&&(!Number.isInteger(editIndex)||!state.cart[editIndex]||state.cart[editIndex].id!==id))throw new Error('El carrito cambió. Vuelve a abrir el postre.');
  const item={id,qty:quantity,options:dessertOptions({options})};
  const next=state.cart.map(cloneDessertItem);
  if(editIndex!==null)next.splice(editIndex,1);
  const same=next.find(i=>dessertSignature(i)===dessertSignature(item));
  if(same){if(same.qty+quantity>99)throw new Error('Máximo 99 unidades por combinación.');same.qty+=quantity}else next.splice(editIndex===null?next.length:Math.min(editIndex,next.length),0,item);
  state.cart=next;save();return item;
}
function openDessertOptions(id,editIndex=null){
  const p=getProduct(id);if(!p||isUnavailable(id)){toast('Este producto está agotado');return}
  const item=editIndex===null?{id,qty:1}:state.cart[editIndex];if(!item||item.id!==id)return;
  const o=dessertOptions(item);dessertEditing={id,editIndex};
  const dialog=document.getElementById('dessert-dialog');
  dialog.innerHTML=`<form id="dessert-form" onsubmit="submitDessertOptions(event)"><div class="dessert-dialog-head"><div><div class="kicker">A tu gusto</div><h2 id="dessert-title">${escapeDessertText(p.name)}</h2></div><button class="ghost" type="button" onclick="closeDessertOptions()" aria-label="Cerrar personalización">✕</button></div><p class="dessert-base">Precio base por unidad: <b>${fmt(p.price)}</b></p><fieldset><legend>Tamaño</legend><div class="dessert-size-options">${dessertSizes(p).map(s=>`<label class="dessert-choice"><input type="radio" name="dessertSize" value="${s.id}" ${o.size===s.id?'checked':''}><span><b>${s.label}</b><small>${s.id==='original'?'Precio del catálogo':'Precio por confirmar'}</small></span></label>`).join('')}</div></fieldset><fieldset><legend>Toppings <span>(opcionales)</span></legend><p class="dessert-help">Selecciona los que quieras solicitar. El negocio confirma disponibilidad y costo.</p><div class="dessert-toppings">${DESSERT_TOPPINGS.map(t=>`<label class="dessert-choice"><input type="checkbox" name="dessertTopping" value="${t.id}" ${o.toppings.includes(t.id)?'checked':''}><span>${t.label}</span></label>`).join('')}</div></fieldset><label class="field">Notas para este postre<textarea id="dessert-notes" maxlength="300" rows="3" placeholder="Ej. sin salsa, toppings aparte…">${escapeDessertText(o.notes)}</textarea></label><label class="field dessert-quantity">Cantidad<input id="dessert-quantity" type="number" min="1" max="99" step="1" value="${item.qty}" required></label><p id="dessert-error" class="dessert-error" role="alert"></p><p class="dessert-help">Puedes pedir el mismo postre con diferentes opciones. Cada combinación aparecerá por separado en tu carrito.</p><div class="dessert-dialog-footer"><button type="button" class="soft" onclick="closeDessertOptions()">Cancelar</button><button type="submit" class="primary">${editIndex===null?'Agregar al carrito':'Guardar cambios'}</button></div></form>`;
  dialog.showModal();
}
function editDessertOptions(index){const item=state.cart[index];if(item)openDessertOptions(item.id,index)}
function closeDessertOptions(){document.getElementById('dessert-dialog').close();dessertEditing=null}
function submitDessertOptions(event){
  event.preventDefault();if(!dessertEditing)return;
  const dialog=document.getElementById('dessert-dialog');
  const options={size:dialog.querySelector('[name="dessertSize"]:checked')?.value,toppings:[...dialog.querySelectorAll('[name="dessertTopping"]:checked')].map(el=>el.value),notes:document.getElementById('dessert-notes').value.trim()};
  try{commitDessertOptions(dessertEditing.id,options,Number(document.getElementById('dessert-quantity').value),dessertEditing.editIndex);closeDessertOptions();updateBadge();if(view==='cart')render();animateCart();toast('Postre guardado en el carrito')}catch(error){document.getElementById('dessert-error').textContent=error.message}
}
document.getElementById('dessert-dialog').addEventListener('close',()=>{dessertEditing=null});
