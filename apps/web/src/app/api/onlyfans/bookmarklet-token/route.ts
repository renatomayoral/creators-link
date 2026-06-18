import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { auth } from '@repo/auth'
import { db, schema } from '@repo/db'
import { eq } from 'drizzle-orm'

const { verification, creator } = schema

// GET /api/onlyfans/bookmarklet-token?creatorId=xxx
// Issues a short-lived token (15 min) that the bookmarklet uses to identify
// which creator is connecting. Returns the ready-to-use bookmarklet href.
export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const creatorId = req.nextUrl.searchParams.get('creatorId')
  if (!creatorId) return NextResponse.json({ error: 'creatorId required' }, { status: 400 })

  const c = await db.query.creator.findFirst({ where: eq(creator.id, creatorId) })
  if (!c || c.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Invalidate any previous token for this creator
  await db
    .delete(verification)
    .where(eq(verification.identifier, `of-bookmarklet:${creatorId}`))

  const token = randomUUID()
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 min

  await db.insert(verification).values({
    id: randomUUID(),
    identifier: `of-bookmarklet:${creatorId}`,
    value: token,
    expiresAt,
  })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const endpoint = `${appUrl}/api/onlyfans/session`

  // The bookmarklet runs on onlyfans.com (same domain = no CORS).
  // It reads document.cookie, grabs the user-id from the page,
  // then POSTs to your server with the token for verification.
  const bookmarkletCode = buildBookmarklet(endpoint, token)

  return NextResponse.json({ token, bookmarkletHref: `javascript:${bookmarkletCode}` })
}

function buildBookmarklet(endpoint: string, token: string): string {
  // Minified — must fit in a bookmarklet href
  // Reads OF cookies + userId from the page globals and sends to our API
  const code = `
(function(){
  var c=document.cookie;
  if(!location.hostname.includes('onlyfans.com')){
    alert('Abra este favorito estando na página do OnlyFans!');
    return;
  }
  var uid='';
  try{
    var m=document.cookie.match(/auth_id=([^;]+)/);
    if(m)uid=m[1];
    if(!uid&&window.__OF_STORE__){uid=String(window.__OF_STORE__.auth&&window.__OF_STORE__.auth.user&&window.__OF_STORE__.auth.user.id||'');}
    if(!uid){var scripts=document.querySelectorAll('script');for(var i=0;i<scripts.length;i++){var t=scripts[i].textContent;var mm=t.match(/"id":\\s*(\\d+)/);if(mm){uid=mm[1];break;}}}
  }catch(e){}
  var body=JSON.stringify({token:${JSON.stringify(token)},cookieStr:c,userId:uid});
  fetch(${JSON.stringify(endpoint)},{method:'POST',headers:{'content-type':'application/json'},body:body,credentials:'omit'})
    .then(function(r){return r.json();})
    .then(function(d){
      if(d.ok){
        var div=document.createElement('div');
        div.style='position:fixed;top:20px;right:20px;z-index:999999;background:#22c55e;color:#fff;padding:16px 24px;border-radius:12px;font-family:sans-serif;font-size:15px;font-weight:bold;box-shadow:0 4px 24px rgba(0,0,0,0.18)';
        div.textContent='✓ OnlyFans conectado ao CreatorsLink!';
        document.body.appendChild(div);
        setTimeout(function(){div.remove();},4000);
      }else{
        alert('Erro: '+(d.error||'Tente novamente'));
      }
    })
    .catch(function(){alert('Erro ao conectar. Tente novamente.');});
})()`.trim().replace(/\n\s*/g, '')

  return encodeURIComponent(code)
}
