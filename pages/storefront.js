// Public storefront improvements. No passwords or customer contact details are stored here.
(() => {
 const form=document.getElementById('checkout');
 const chat=document.querySelector('.chat');
 if(chat){chat.textContent='💬 Soporte';chat.setAttribute('aria-label','Contactar soporte por WhatsApp');}
 if(!form)return;form.querySelector('.notice').textContent='Domicilio fijo: $4.500. Confirmaremos disponibilidad y el precio de los adicionales antes del pago.';
 const payment=document.createElement('label');payment.className='paylabel';payment.textContent='¿Cómo quieres pagar?';
 const select=document.createElement('select');select.name='payment';select.required=true;
 for(const [value,label,disabled] of [['Efectivo','Efectivo al recibir',false],['WhatsApp','Coordinar el pago por WhatsApp',false],['Nequi','Nequi (coordinar por WhatsApp)',false]]){const option=new Option(label,value);option.disabled=disabled;select.add(option)}
 payment.append(select);form.querySelector('.notice').before(payment);
 const totals=document.createElement('div');totals.className='totals';totals.setAttribute('aria-live','polite');
 const total=document.getElementById('total');total.hidden=true;total.after(totals);
 function update(){const subtotal=cart.reduce((sum,item)=>{const product=products.find(p=>p.id===item.id);return sum+(product?product.price*item.qty:0)},0);totals.innerHTML='<div class="row"><span>Productos</span><strong>'+money(subtotal)+'</strong></div><div class="row"><span>Domicilio</span><strong>$ 4.500</strong></div><div class="row"><span>Tamaño grande y toppings</span><span>Por cotizar</span></div><div class="row grand"><span>Total con domicilio</span><span>'+money(subtotal+4500)+'</span></div><p class="checkout-help">Incluye domicilio de $4.500. El tamaño grande y los toppings se cotizan aparte; confirma los adicionales antes de pagar.</p>';}
 new MutationObserver(update).observe(total,{childList:true,subtree:true,characterData:true});update();
 form.onsubmit=event=>{event.preventDefault();if(!cart.length)return;const data=new FormData(form);const subtotal=cart.reduce((sum,x)=>sum+products.find(p=>p.id===x.id).price*x.qty,0);const lines=cart.map(x=>{const p=products.find(p=>p.id===x.id);return x.qty+' × '+p.name+' — '+money(p.price*x.qty)+'\n'+[x.size,...x.toppings,x.note].filter(Boolean).join(' · ')});const message=['¡Hola, Al Horno! Quiero hacer este pedido:','',...lines,'','Productos: '+money(subtotal),'Domicilio: '+money(4500),'Adicionales: por cotizar','Total con domicilio: '+money(subtotal+4500),'Forma de pago: '+data.get('payment'),'Nombre: '+data.get('name'),'Celular: '+data.get('phone'),'Dirección: '+data.get('address'),'Notas: '+data.get('notes'),'Por favor confirmen disponibilidad y total final.'].join('\n');location.href='https://wa.me/573222798084?text='+encodeURIComponent(message)};
})();
