// Sites validates and supplies these identity headers before invoking the Worker.
// Do not expose this Worker through an alternate, unauthenticated origin.
const OWNER_EMAIL='jtatianaortizbernal@gmail.com';
export function requestUser(request){
  const id=request.headers.get('oai-authenticated-user-id');
  const email=request.headers.get('oai-authenticated-user-email')?.trim().toLowerCase();
  if(!id||!email)return null;
  let name=email;
  if(request.headers.get('oai-authenticated-user-full-name-encoding')==='percent-encoded-utf-8'){
    try{name=decodeURIComponent(request.headers.get('oai-authenticated-user-full-name')||email)}catch{}
  }
  return {id,email,name,role:email===OWNER_EMAIL?'administrator':'user'};
}
function response(body,status=200,type='text/html; charset=utf-8'){
  return new Response(body,{status,headers:{'Content-Type':type,'Cache-Control':'private, no-store','Vary':'oai-authenticated-user-id, oai-authenticated-user-email','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin'}});
}
function safeJSON(value){return JSON.stringify(value).replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/&/g,'\\u0026')}
export function createHandler(assets){
  return {
    async fetch(request,env={}){
      const url=new URL(request.url),user=requestUser(request);
      if(url.pathname==='/api/orders'||url.pathname.startsWith('/api/orders/')||url.pathname==='/api/catalog'||url.pathname==='/api/user-state')return ordersAPI(request,env,user,assets.products);
      if(request.method!=='GET'&&request.method!=='HEAD')return response('Método no permitido',405,'text/plain; charset=utf-8');
      if(url.pathname==='/api/session')return response(JSON.stringify({user}),200,'application/json; charset=utf-8');
      if(url.pathname==='/customization.css')return response(assets.css,200,'text/css; charset=utf-8');
      if(url.pathname==='/customization.js')return response(assets.js,200,'text/javascript; charset=utf-8');
      if(url.pathname==='/shared-orders.js')return response(assets.shared,200,'text/javascript; charset=utf-8');
      if(url.pathname==='/iniciar-sesion'||url.pathname==='/crear-cuenta'){
        if(user)return new Response(null,{status:302,headers:{Location:user.role==='administrator'?'/admin':'/','Cache-Control':'no-store'}});
        return response(url.pathname==='/crear-cuenta'?assets.signup:assets.login);
      }
      if(url.pathname==='/admin'||url.pathname.startsWith('/admin/')){
        if(!user)return new Response(null,{status:302,headers:{Location:'/signin-with-chatgpt?return_to=%2Fadmin','Cache-Control':'no-store'}});
        if(user.role!=='administrator')return response('<!doctype html><html lang="es"><meta charset="utf-8"><title>Acceso restringido · Al Horno</title><h1>No tienes permiso para ver esta página</h1><p><a href="/">Volver a Al Horno</a></p></html>',403);
        return response(assets.admin.replace('/*AUTH_BOOTSTRAP*/',()=>safeJSON(user)));
      }
      if(url.pathname!=='/'&&url.pathname!=='/index.html')return response('Página no encontrada',404,'text/plain; charset=utf-8');
      if(!user)return response(assets.welcome);
      if(user.role==='administrator')return new Response(null,{status:302,headers:{Location:'/admin','Cache-Control':'no-store'}});
      return response(assets.user.replace('/*AUTH_BOOTSTRAP*/',()=>safeJSON(user)));
    }
  };
}
