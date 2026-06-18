import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { auth } from '@repo/auth'
import { db, schema } from '@repo/db'
import { eq } from 'drizzle-orm'

const { verification, creator } = schema

// GET /api/fansly/bookmarklet-token?creatorId=xxx
export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const creatorId = req.nextUrl.searchParams.get('creatorId')
  if (!creatorId) return NextResponse.json({ error: 'creatorId required' }, { status: 400 })

  const c = await db.query.creator.findFirst({ where: eq(creator.id, creatorId) })
  if (!c || c.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await db.delete(verification).where(eq(verification.identifier, `fansly-bookmarklet:${creatorId}`))

  const token = randomUUID()
  await db.insert(verification).values({
    id: randomUUID(),
    identifier: `fansly-bookmarklet:${creatorId}`,
    value: token,
    expiresAt: new Date(Date.now() + 15 * 60 * 1000),
  })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const endpoint = `${appUrl}/api/fansly/session`
  const bookmarkletCode = buildBookmarklet(endpoint, token)

  return NextResponse.json({ token, bookmarkletHref: `javascript:${bookmarkletCode}` })
}

function buildBookmarklet(endpoint: string, token: string): string {
  // Reads Fansly auth token from localStorage and sends to our server
  const code = `
(function(){
  if(!location.hostname.includes('fansly.com')){
    alert('Abra este favorito estando na página do Fansly!');
    return;
  }
  var authToken='';
  var deviceId='';
  try{
    var sess=localStorage.getItem('session_active_session');
    if(sess){var s=JSON.parse(sess);authToken=s.token||s.auth_token||s.value||'';}
    deviceId=localStorage.getItem('device_device_id')||'';
  }catch(e){}
  if(!authToken){alert('Não foi possível encontrar o token do Fansly. Certifique-se de estar logado.');return;}
  fetch(${JSON.stringify(endpoint)},{
    method:'POST',
    headers:{'content-type':'application/json'},
    body:JSON.stringify({token:${JSON.stringify(token)},authToken:authToken,deviceId:deviceId}),
    credentials:'omit'
  })
  .then(function(r){return r.json();})
  .then(function(d){
    if(d.ok){
      var div=document.createElement('div');
      div.style='position:fixed;top:20px;right:20px;z-index:999999;background:#9333ea;color:#fff;padding:16px 24px;border-radius:12px;font-family:sans-serif;font-size:15px;font-weight:bold;box-shadow:0 4px 24px rgba(0,0,0,0.18)';
      div.textContent='✓ Fansly conectado ao CreatorsLink!';
      document.body.appendChild(div);
      setTimeout(function(){div.remove();},4000);
    }else{alert('Erro: '+(d.error||'Tente novamente'));}
  })
  .catch(function(){alert('Erro ao conectar. Tente novamente.');});
})()`.trim().replace(/\n\s*/g, '')

  return encodeURIComponent(code)
}
