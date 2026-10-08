import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
const root=path.resolve(import.meta.dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
let base=read('source/index.html');
const catalogContext={};vm.createContext(catalogContext);vm.runInContext(base.slice(base.indexOf('const photo='),base.indexOf('const cats='))+'\nglobalThis.catalogProducts=products;',catalogContext);
const adminFunctions=['adminState','admin','adminOrders','setStatus','saveOrderReport','adminProducts','createProduct','toggleAvailability','deleteProduct','adminSupport','replySupport','closeSupport'];
const removeFunctions=['loadAccounts','saveAccounts','renderAuth','toggleAdmin','clientLogin','register','adminLogin','enter','logout'];
base=base.split('\n').filter(line=>!removeFunctions.some(name=>line.startsWith(`function ${name}(`))&&!line.startsWith('const ACCOUNTS_STORE=')&&line.trim()!=='renderAuth();').join('\n');
base=base.replaceAll("role==='admin'","role==='administrator'").replaceAll("role==='client'","role==='user'");
base=base.replace("pay='Efectivo', adminOpen=false, activeUserEmail=''","pay='Efectivo', activeUserEmail=''");
base=base.replace('<div id="toast"></div>\n</div>','</div>\n<div id="toast" role="status" aria-live="polite"></div>');
base=base.replace('<div id="auth"></div>','<div id="auth" class="hidden"></div>');
base=base.replace("setInterval(()=>syncFromStorage(true),800);",'');
base=base.replace(/<a class="primary wide" style="display:block;text-align:center;text-decoration:none" href="#" target="_blank" rel="noopener noreferrer" onclick="return prepareWhatsApp\(this\)">[\s\S]*?<\/a>/,'<button class="primary wide" data-order-submit="Guardar y abrir WhatsApp" onclick="placeOrder(true)">Guardar y abrir WhatsApp</button>');
base=base.replace('Se abrirá WhatsApp con tu pedido listo para enviar al +57 322 2798084. Confirma el envío en el chat y espera la respuesta del negocio. Tu carrito se conserva.','Tu pedido se guardará en Al Horno antes de abrir WhatsApp. Envía el mensaje en el chat para coordinar con el negocio.');
base=base.replace('<button class="soft wide" onclick="placeOrder()">Guardar pedido de demostración</button>','<button class="soft wide" data-order-submit="Confirmar sin WhatsApp" onclick="placeOrder(false)">Confirmar sin WhatsApp</button>');
base=base.replace(/function go\(v\)\{[^\n]+/,"function go(v){if(v.startsWith('admin')&&role!=='administrator'){toast('No tienes permiso para ver esta sección');return}view=v;render();window.scrollTo({top:0,behavior:'smooth'})}");
const boot=`<script>
const signedInUser=Object.freeze(/*AUTH_BOOTSTRAP*/);
function logout(){window.location.assign('/signout-with-chatgpt?return_to=%2F')}
activeUserEmail=signedInUser.email;
role=signedInUser.role;
state=role==='administrator'?adminState():clientState(activeUserEmail);
state.profile={...state.profile,name:state.profile.name||signedInUser.name,email:signedInUser.email};
view=role==='administrator'?'admin':'home';
document.getElementById('site').classList.remove('hidden');
refreshSnapshots();render();initializeSharedOrders();
</script>`;
base=base.replace('</body>','<script src="/shared-orders.js"></script>\n'+boot+'\n</body>');
let user=base.split('\n').filter(line=>!adminFunctions.some(name=>line.startsWith(`function ${name}(`))).join('\n');
// The public user document never includes administrator action implementations.
user=user.replace("state=role==='administrator'?adminState():clientState(activeUserEmail)","state=clientState(activeUserEmail)");
const style=base.match(/<style>([\s\S]*?)<\/style>/)[1];
const login=`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Al Horno · Inicia sesión</title><style>${style}.login-link{display:block;text-align:center;text-decoration:none;font-size:16px}.loginCard p{font-size:16px;line-height:1.6}</style></head><body><main class="login"><div class="loginVisual"><img src="https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&w=1000&q=84" alt="Postres Al Horno"><div class="loginText"><span class="pill">AL HORNO · POSTRES</span><h1>Tu momento dulce empieza aquí.</h1><p>Postres artesanales para disfrutar en casa.</p></div></div><div class="loginPane"><section class="loginCard"><div class="brand"><div class="logo">🧁</div><div>Al Horno<small>POSTRES ARTESANALES</small></div></div><h2>Inicia sesión</h2><p>Usa tu cuenta de ChatGPT para entrar a Al Horno.</p><a class="primary wide login-link" href="/signin-with-chatgpt?return_to=%2F" target="_top">Continuar con ChatGPT</a><p style="color:var(--muted)">Si es tu primera visita, tu perfil se creará al entrar. No necesitas otra contraseña.</p></section></div></main></body></html>`;
function authPage(title,content){return login.replace('Al Horno · Inicia sesión','Al Horno · '+title).replace(/<h2>Inicia sesión<\/h2>[\s\S]*?<\/section>/,'<h2>'+title+'</h2>'+content+'</section>')}
const welcome=authPage('Bienvenido a Al Horno','<p>Elige cómo quieres entrar.</p><a class="primary wide login-link" href="/iniciar-sesion">Iniciar sesión</a><a class="soft wide login-link" style="margin-top:12px" href="/crear-cuenta">Crear una cuenta</a>');
const signIn=authPage('Iniciar sesión','<p>Accede a tu perfil de Al Horno con tu cuenta de ChatGPT.</p><a class="primary wide login-link" href="/signin-with-chatgpt?return_to=%2F" target="_top">Iniciar sesión con ChatGPT</a><p>¿Es tu primera vez? <a href="/crear-cuenta">Crear una cuenta</a></p><a href="/">Volver al inicio</a>');
const signup=authPage('Crear una cuenta','<p>Vincula tu cuenta de ChatGPT para comenzar tu perfil en Al Horno. No necesitas crear otra contraseña.</p><a class="primary wide login-link" href="/signin-with-chatgpt?return_to=%2F" target="_top">Crear mi perfil con ChatGPT</a><p>¿Ya tienes cuenta? <a href="/iniciar-sesion">Iniciar sesión</a></p><a href="/">Volver al inicio</a>');
const assets={welcome,login:signIn,signup,user,admin:base,products:catalogContext.catalogProducts,shared:read('source/shared-orders.js'),js:read('source/customization.js'),css:read('source/customization.css')};
const runtime=read('worker/orders.mjs')+'\n'+read('worker/runtime.mjs');
fs.mkdirSync(path.join(root,'dist/server'),{recursive:true});fs.mkdirSync(path.join(root,'dist/.openai'),{recursive:true});
fs.writeFileSync(path.join(root,'dist/server/index.js'),runtime+'\nconst assets='+JSON.stringify(assets)+';\nexport default createHandler(assets);\n');
const manifest=JSON.parse(read('.openai/hosting.json'));delete manifest.static;
fs.writeFileSync(path.join(root,'.openai/hosting.json'),JSON.stringify(manifest,null,2)+'\n');
fs.writeFileSync(path.join(root,'dist/.openai/hosting.json'),JSON.stringify(manifest));
if(fs.existsSync(path.join(root,'drizzle')))fs.cpSync(path.join(root,'drizzle'),path.join(root,'dist/.openai/drizzle'),{recursive:true});
console.log('Built role-protected Worker with embedded assets.');
