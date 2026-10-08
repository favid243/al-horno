import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const root=new URL('../',import.meta.url),code=fs.readFileSync(new URL('dist/server/index.js',root),'utf8');
const {default:worker}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const origin='https://al-horno-postres.jtatianaortiz.chatgpt.site';
const owner={'oai-authenticated-user-id':'verified-owner','oai-authenticated-user-email':'jtatianaortizbernal@gmail.com'};
const customer={'oai-authenticated-user-id':'verified-user','oai-authenticated-user-email':'cliente@example.test'};
const request=(path,headers={})=>worker.fetch(new Request(origin+path,{headers}));
const welcome=await(await request('/')).text();assert.ok(welcome.includes('href="/iniciar-sesion"'));assert.ok(welcome.includes('href="/crear-cuenta"'));
const login=await(await request('/iniciar-sesion')).text(),signup=await(await request('/crear-cuenta')).text();assert.ok(login.includes('<h2>Iniciar sesión</h2>'));assert.ok(signup.includes('<h2>Crear una cuenta</h2>'));assert.notEqual(login,signup);assert.ok(login.includes('Iniciar sesión con ChatGPT'));assert.ok(signup.includes('Crear mi perfil con ChatGPT'));assert.ok(!login.includes('type="password"'));assert.ok(!login.includes('Acceso administrativo'));
assert.equal((await request('/crear-cuenta',customer)).headers.get('location'),'/');assert.equal((await request('/iniciar-sesion',owner)).headers.get('location'),'/admin');
assert.equal((await request('/admin')).status,302);assert.equal((await request('/admin',customer)).status,403);assert.equal((await request('/admin?role=administrator',{...customer,'x-role':'administrator'})).status,403);
assert.equal((await request('/',owner)).headers.get('location'),'/admin');
const admin=await(await request('/admin',owner)).text(),user=await(await request('/',customer)).text();
assert.ok(admin.includes('function adminOrders('));assert.ok(!user.includes('function adminOrders('));
assert.ok(!admin.includes('Horno#2026'));assert.ok(!user.includes('admin@alhorno.local'));
assert.equal((await(await request('/api/session',customer)).json()).user.role,'user');assert.equal((await(await request('/api/session',owner)).json()).user.role,'administrator');
const escape=await(await request('/',{...customer,'oai-authenticated-user-full-name-encoding':'percent-encoded-utf-8','oai-authenticated-user-full-name':encodeURIComponent('</script>$&')})).text();assert.ok(!escape.includes('/*AUTH_BOOTSTRAP*/'));
const custom=await(await request('/customization.js')).text();
const shared=await(await request('/shared-orders.js')).text();
function executePage(html){
 const nodes=new Map();const node=id=>{if(!nodes.has(id))nodes.set(id,{innerHTML:'',textContent:'',classList:{add(){},remove(){},toggle(){}},addEventListener(){},before(){},setAttribute(){}});return nodes.get(id)};
 const ctx={document:{getElementById:node,activeElement:null},window:{addEventListener(){},scrollTo(){}},fetch:async path=>({ok:true,json:async()=>path==='/api/catalog'?{version:0,customProducts:[],unavailable:[]}:{orders:[]}}),localStorage:{getItem(){return null},setItem(){}},setTimeout(){},setInterval(){},Intl,console,AbortController};vm.createContext(ctx);
 for(const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g))vm.runInContext(match[1].includes('src="/customization.js"')?custom:match[1].includes('src="/shared-orders.js"')?shared:match[2],ctx);
 return {ctx,nodes,role:vm.runInContext('role',ctx)};
}
const a=executePage(admin),u=executePage(user);assert.equal(a.role,'administrator');assert.equal(u.role,'user');assert.ok(a.nodes.get('app').innerHTML.includes('Dashboard'));assert.ok(u.nodes.get('app').innerHTML.includes('Postres recién preparados'));
assert.ok(a.nodes.get('nav').innerHTML.includes('adminOrders'));assert.ok(!u.nodes.get('nav').innerHTML.includes('adminOrders'));
const prior=u.nodes.get('app').innerHTML;vm.runInContext("go('adminOrders')",u.ctx);assert.equal(u.nodes.get('app').innerHTML,prior);
console.log('PASS: acceso único, roles verificados, propietario administrador, usuario por defecto, acceso directo denegado, sin credenciales antiguas y arranque completo de ambas vistas.');
