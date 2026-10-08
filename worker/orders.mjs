function json(body,status=200){return new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}})}
function fail(message,status=400){throw Object.assign(new Error(message),{status})}
function text(value,name,max=250,required=true){if(typeof value!=='string'||value.length>max||(required&&!value.trim()))fail('Revisa '+name);return value.trim()}
const TOPPINGS=['chocolate','arequipe','oreo','fresas','helado'];
function options(raw={}){if(!raw||typeof raw!=='object'||Array.isArray(raw))fail('Opciones de postre inválidas');const size=raw.size??'original',toppings=raw.toppings??[],notes=raw.notes??'';if(!['original','grande'].includes(size)||!Array.isArray(toppings)||toppings.length>5||toppings.some(t=>!TOPPINGS.includes(t)))fail('Opciones de postre inválidas');return {size,toppings:[...new Set(toppings)].sort(),notes:text(notes,'las notas',300,false)}}
async function catalogState(db){const row=await db.prepare('SELECT version, payload FROM catalog WHERE id = 1').first();return row?{...JSON.parse(row.payload),version:row.version}:{customProducts:[],unavailable:[],version:0}}
function record(row){return {...JSON.parse(row.payload),version:row.version}}
export async function ordersAPI(request,env,user,baseProducts){
 const url=new URL(request.url);
 if(!user)return json({error:'Inicia sesión para continuar'},401);
 if(!env.DB)return json({error:'Los pedidos no están disponibles temporalmente. Intenta nuevamente.'},503);
 try{
  const method=request.method,path=url.pathname;
  if(!['GET','HEAD'].includes(method)){
   if(request.headers.get('Origin')!==url.origin)fail('Origen no permitido',403);
   if(!request.headers.get('Content-Type')?.startsWith('application/json'))fail('Formato no permitido',415);
  }
  async function body(){const raw=await request.text();if(raw.length>100000)fail('Solicitud demasiado grande',413);let parsed;try{parsed=JSON.parse(raw)}catch{fail('Solicitud inválida')}if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))fail('Solicitud inválida');return parsed}
  if(path==='/api/user-state'&&method==='GET'){
   const row=await env.DB.prepare('SELECT payload, updated_at FROM user_states WHERE owner_id = ?').bind(user.id).first();
   return json({state:row?JSON.parse(row.payload):null,updatedAt:row?.updated_at||0});
  }
  if(path==='/api/user-state'&&method==='PUT'){
   const b=await body();
   const profile=b.profile&&typeof b.profile==='object'&&!Array.isArray(b.profile)?b.profile:{};
   const favorites=Array.isArray(b.favorites)?[...new Set(b.favorites.filter(x=>typeof x==='string').slice(0,500))]:[];
   const addresses=Array.isArray(b.addresses)?b.addresses.slice(0,20).map(a=>({name:text(a?.name||'','el nombre de la dirección',80,false),address:text(a?.address||'','la dirección',250,false),district:text(a?.district||'','el barrio',120,false)})).filter(a=>a.name&&a.address):[];
   const state={profile:{name:text(profile.name||user.name||'','el nombre',120,false),email:user.email,phone:text(profile.phone||'','el teléfono',30,false)},favorites,addresses,activeOrderId:typeof b.activeOrderId==='string'?b.activeOrderId:null,discount:b.discount==='DULCE10'?'DULCE10':null};
   const now=Date.now(),payload=JSON.stringify(state);
   await env.DB.prepare('INSERT INTO user_states (owner_id, updated_at, payload) VALUES (?, ?, ?) ON CONFLICT(owner_id) DO UPDATE SET updated_at = excluded.updated_at, payload = excluded.payload').bind(user.id,now,payload).run();
   return json({state,updatedAt:now});
  }
  if(path==='/api/catalog'&&method==='GET')return json(await catalogState(env.DB));
  if(path==='/api/catalog'&&method==='PUT'){
   if(user.role!=='administrator')fail('No tienes permiso',403);
   const b=await body();if(!Number.isInteger(b.version)||!Array.isArray(b.customProducts)||b.customProducts.length>200||!Array.isArray(b.unavailable))fail('Catálogo inválido');
   const customProducts=b.customProducts.map(p=>{const id=text(p.id,'el producto',90);if(!/^custom-[a-z0-9-]+$/i.test(id))fail('Identificador inválido');if(!Number.isInteger(p.price)||p.price<1000||p.price>10000000)fail('Precio inválido');let img;try{img=new URL(p.img);if(img.protocol!=='https:')fail('Usa una imagen HTTPS')}catch{fail('Imagen inválida')}
     return {id,name:text(p.name,'el nombre',120),cat:text(p.cat,'la categoría',60),price:p.price,desc:text(p.desc,'la descripción',500),img:img.href,tag:text(p.tag||'','la etiqueta',60,false),rating:5};});
   const allowed=new Set([...baseProducts,...customProducts].map(p=>p.id));if(customProducts.some(p=>baseProducts.some(x=>x.id===p.id))||new Set(customProducts.map(p=>p.id)).size!==customProducts.length||b.unavailable.some(id=>!allowed.has(id)))fail('Productos inválidos');
   const payload=JSON.stringify({customProducts,unavailable:[...new Set(b.unavailable)]});
   const result=b.version===0?await env.DB.prepare('INSERT INTO catalog (id, version, payload) VALUES (1, 1, ?) ON CONFLICT(id) DO NOTHING').bind(payload).run():await env.DB.prepare('UPDATE catalog SET payload = ?, version = version + 1 WHERE id = 1 AND version = ?').bind(payload,b.version).run();
   if(result.meta.changes!==1)fail('El catálogo cambió en otro dispositivo. Recarga antes de guardar.',409);
   return json(await catalogState(env.DB));
  }
  if(path==='/api/orders'&&method==='GET'){
   const result=user.role==='administrator'?await env.DB.prepare('SELECT payload, version FROM orders ORDER BY created_at DESC, id DESC').all():await env.DB.prepare('SELECT payload, version FROM orders WHERE owner_id = ? ORDER BY created_at DESC, id DESC').bind(user.id).all();
   return json({orders:result.results.map(record)});
  }
  if(path==='/api/orders'&&method==='POST'){
   const b=await body(),key=text(b.requestKey,'la solicitud',80);if(!/^[a-zA-Z0-9-]{16,80}$/.test(key))fail('Solicitud inválida');
   const existing=await env.DB.prepare('SELECT payload, version FROM orders WHERE owner_id = ? AND request_key = ?').bind(user.id,key).first();if(existing)return json({order:record(existing)});
   if(!Array.isArray(b.items)||!b.items.length||b.items.length>50)fail('Revisa tu carrito');
   const catalog=await catalogState(env.DB),products=[...baseProducts,...catalog.customProducts];
   const items=b.items.map(i=>{if(!i||typeof i!=='object')fail('Producto inválido');const p=products.find(p=>p.id===i.id);if(!p||catalog.unavailable.includes(i.id))fail('Un postre ya no está disponible. Revisa tu carrito.',409);if(i.expectedPrice!==undefined&&i.expectedPrice!==p.price)fail('El precio de un postre cambió. Actualiza el carrito antes de confirmar.',409);if(!Number.isInteger(i.qty)||i.qty<1||i.qty>99)fail('Cantidad inválida');return {id:p.id,name:p.name,cat:p.cat,img:p.img,price:p.price,qty:i.qty,options:options(i.options)};});
   const sub=items.reduce((s,i)=>s+i.price*i.qty,0),disc=b.discount==='DULCE10'&&sub>=25000?Math.min(8000,Math.round(sub*.1)):0,delivery=sub>=50000?0:6000;
   const name=text(b.name,'el nombre',120),phone=text(b.phone,'el teléfono',30),address=text(b.address,'la dirección',250),district=text(b.district,'el barrio',120),notes=text(b.notes||'','las indicaciones',500,false);
   if(!/^[+\d\s()-]+$/.test(phone)||!/^\d{7,15}$/.test(phone.replace(/\D/g,'')))fail('Teléfono inválido');
   if(b.terms!==true)fail('Acepta los términos para continuar');
   if(!['Efectivo','Nequi','Daviplata','PSE','Tarjeta'].includes(b.payment))fail('Método de pago inválido');
   const now=Date.now(),id='AH-'+crypto.randomUUID();
   const order={id,created:now,updatedAt:now,status:0,name,phone,address,district,notes,email:user.email,payment:b.payment,total:sub-disc+delivery,sub,disc,delivery,items,awaitingQuote:items.some(i=>i.options.size!=='original'||i.options.toppings.length>0),etaText:'',adminNote:'',version:1};
   await env.DB.prepare('INSERT INTO orders (id, owner_id, request_key, created_at, updated_at, version, payload) VALUES (?, ?, ?, ?, ?, 1, ?) ON CONFLICT(owner_id, request_key) DO NOTHING').bind(id,user.id,key,now,now,JSON.stringify(order)).run();
   const saved=await env.DB.prepare('SELECT payload, version FROM orders WHERE owner_id = ? AND request_key = ?').bind(user.id,key).first();
   return json({order:record(saved)},201);
  }
  const match=path.match(/^\/api\/orders\/(AH-[a-f0-9-]+)$/);
  if(match&&method==='PATCH'){
   if(user.role!=='administrator')fail('No tienes permiso para cambiar pedidos',403);
   const b=await body();if(!Number.isInteger(b.version)||!Number.isInteger(b.status)||b.status<0||b.status>5)fail('Actualización inválida');
   const row=await env.DB.prepare('SELECT payload, version FROM orders WHERE id = ?').bind(match[1]).first();if(!row)fail('Pedido no encontrado',404);
   const prior=record(row);if(prior.version!==b.version)fail('El pedido cambió en otro dispositivo. Revisa su estado actual.',409);
   const next={...prior,status:b.status,etaText:text(b.etaText||'','el tiempo de entrega',120,false),adminNote:text(b.adminNote||'','el mensaje',1000,false),updatedAt:Date.now(),version:prior.version+1};if(b.status===5)next.completedAt=next.updatedAt;
   const result=await env.DB.prepare('UPDATE orders SET payload = ?, updated_at = ?, version = version + 1 WHERE id = ? AND version = ?').bind(JSON.stringify(next),next.updatedAt,next.id,prior.version).run();
   if(result.meta.changes!==1)fail('El pedido cambió en otro dispositivo. Vuelve a revisarlo.',409);
   return json({order:next});
  }
  return json({error:'Ruta no disponible'},404);
 }catch(error){if(error.status)return json({error:error.message},error.status);console.error('Order storage failed',error.name);return json({error:'No pudimos guardar o consultar los pedidos. Reintenta; tu carrito se conserva.'},503)}
}
