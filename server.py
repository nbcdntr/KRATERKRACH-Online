"""KRATERKRACH 1.0 free hosted WebSocket lobby: six total seats including CPUs.
This beta identity registry uses SQLite. Set KRATERKRACH_ID_DB to a durable mount for
names that survive server restarts/redeploys. The default free Render filesystem is ephemeral.
"""
import asyncio
import hashlib
import json
import os
import re
import secrets
import sqlite3
import time
from pathlib import Path
from aiohttp import WSMsgType, web

ROOT=Path(__file__).resolve().parent
PUBLIC=ROOT/'web'
rooms={}
ABC='ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
TTL=2*3600
RECONNECT_GRACE=5*60
MAX_MESSAGE=550_000
DB_PATH=os.environ.get('KRATERKRACH_ID_DB',str(ROOT/'kk_identity.sqlite3'))

# Each candidate is 2-3 short English words, at most 18 characters including spaces.
FIRST='Tiny Silly Sneaky Angry Fuzzy Spicy Turbo Wobbly Sleepy Moody Crazy Fluffy Grumpy Speedy Lazy Lucky Bouncy Cosmic Toasty Mighty Mini Funky Jolly Cheeky Dizzy Noisy Crispy Happy Zippy Wacky Epic'.split()
SECOND='Pickle Potato Waffle Noodle Pigeon Muffin Banana Donut Goose Nugget Toast Turtle Hamster Pancake Duck Cactus Ninja Tofu Taco Turnip Onion Kiwi Gopher Llama Panda Blob Bison Robot Otter Penguin'.split()
THIRD='Boss King Kid Fox Duck Cat Rat Pup Ace Bug Egg Pie Pop Joe Man Pal Pro Zap'.split()

def db_connect():
    db=sqlite3.connect(DB_PATH,timeout=10)
    db.execute('CREATE TABLE IF NOT EXISTS identities (token_hash TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, created INTEGER NOT NULL)')
    return db

def choose_username(token):
    """Atomic, immutable server-side allocation; durable only with persistent DB file."""
    digest=hashlib.sha256(token.encode('ascii')).hexdigest()
    with db_connect() as db:
        row=db.execute('SELECT name FROM identities WHERE token_hash=?',(digest,)).fetchone()
        if row:return row[0]
        for _ in range(9000):
            words=[secrets.choice(FIRST),secrets.choice(SECOND)]
            if secrets.randbelow(4):words.append(secrets.choice(THIRD))
            name=' '.join(words)
            if len(name)>18:continue
            try:
                db.execute('INSERT INTO identities VALUES(?,?,?)',(digest,name,int(time.time())))
                db.commit()
                return name
            except sqlite3.IntegrityError:
                row=db.execute('SELECT name FROM identities WHERE token_hash=?',(digest,)).fetchone()
                if row:return row[0]
    raise RuntimeError('Username registry is full')

def code_new():
    for _ in range(100):
        code=''.join(secrets.choice(ABC) for _ in range(6))
        if code not in rooms:return code
    raise RuntimeError('No room code')

def alliances(room):
    """Pairs require reciprocal invitations. Nobody belongs to two teams."""
    peers=room['peers']
    pairs={}
    for seat,p in peers.items():
        desired=p.get('request',-1)
        if desired in peers and desired != seat and peers[desired].get('request') == seat:
            pairs[seat]=desired
    return pairs

def roster(room):
    pairs=alliances(room)
    entries=[{'seat':seat,'name':p['name'],'tank':p['tank'],'bot':False,
              'connected':p.get('ws') is not None and not p['ws'].closed,'ally':pairs.get(seat,-1),'request':p.get('request',-1)}
             for seat,p in sorted(room['peers'].items())]
    for k in range(room['bots']):
        entries.append({'seat':len(room['peers'])+k,'name':f'CPU {k+1}',
                        'tank':['scout','titan','artillery','guardian'][k%4],
                        'bot':True,'connected':True,'ally':-1,'request':-1})
    return entries

async def send(ws,data):
    if ws is None or ws.closed:return
    try:await ws.send_str(json.dumps(data,separators=(',',':'),allow_nan=False))
    except (ConnectionError,RuntimeError,TypeError,ValueError):pass

async def send_all(room,data):
    await asyncio.gather(*(send(p['ws'],data) for p in list(room['peers'].values())))

async def broadcast_roster(room):
    await send_all(room,{'type':'roster','players':roster(room),
                         'maxPlayers':room['limit'],'maxRounds':room['rounds'],
                         'bots':room['bots'],'started':room['started']})

async def ws_handler(req):
    mode=req.query.get('mode','')
    if mode not in ('host','guest','resume'):return web.Response(status=400,text='Invalid role')
    token=req.query.get('id','').strip()
    if not re.fullmatch('[0-9a-f]{32}',token):return web.Response(status=400,text='Missing device identity')
    try:name=choose_username(token)
    except Exception:return web.Response(status=503,text='Identity registry unavailable')
    previous=None
    if mode=='host':
        try:
            limit=max(2,min(6,int(req.query.get('maxPlayers','6'))))
            rounds=max(2,min(10,int(req.query.get('maxRounds','3'))))
            bots=max(0,min(limit-1,int(req.query.get('bots','0'))))
        except ValueError:return web.Response(status=400,text='Invalid settings')
        code=code_new()
        room={'code':code,'peers':{},'limit':limit,'rounds':rounds,
              'bots':bots,'started':False,'created':time.time(),'last_state':None}
        rooms[code]=room
        seat=0
    else:
        code=req.query.get('code','').strip().upper()
        room=rooms.get(code)
        if room is None or time.time()-room['created']>TTL:return web.Response(status=404,text='Room not found or expired')
        if mode=='resume':
            found=next(((seat,p) for seat,p in room['peers'].items() if p['token']==token),None)
            if found is None:return web.Response(status=403,text='Reserved seat not found')
            seat,previous=found
            if previous.get('disconnected_at') and time.time()-previous['disconnected_at']>RECONNECT_GRACE:
                return web.Response(status=403,text='Reconnect grace period expired')
        else:
            if room['started']:return web.Response(status=403,text='Game started; use resume')
            if len(room['peers'])+room['bots']>=room['limit']:return web.Response(status=403,text='Room full')
            seat=next((s for s in range(1,room['limit']-room['bots']) if s not in room['peers']),None)
            if seat is None:return web.Response(status=403,text='Room full')
    if mode!='resume' and any(p['token']==token for p in room['peers'].values()):
        return web.Response(status=409,text='This player has already joined; use resume')
    slot=previous['slot'] if previous else {'seat':seat}
    ws=web.WebSocketResponse(heartbeat=25,max_msg_size=MAX_MESSAGE)
    await ws.prepare(req)
    if previous:
        old_ws=previous.get('ws')
        previous['ws']=ws
        previous['disconnected_at']=None
        if old_ws is not None and not old_ws.closed:await old_ws.close()
    else:
        room['peers'][seat]={'ws':ws,'name':name,'tank':'scout','slot':slot,'token':token,'request':-1,'disconnected_at':None}
    await send(ws,{'type':'welcome','code':code,'seat':seat,'name':name,
                   'resumed':mode=='resume','maxPlayers':room['limit'],'maxRounds':room['rounds'],'bots':room['bots']})
    await broadcast_roster(room)
    if mode=='resume' and room.get('last_state'):
        await send(ws,{'type':'resume_state' if seat==0 else 'state',**room['last_state']})
    try:
        async for msg in ws:
            if msg.type!=WSMsgType.TEXT or len(msg.data)>MAX_MESSAGE:continue
            try:data=json.loads(msg.data)
            except (ValueError,TypeError):continue
            if not isinstance(data,dict):continue
            kind=data.get('type')
            seat=slot['seat']
            if room['peers'].get(seat,{}).get('ws') is not ws:break
            if kind=='leave':
                if seat==0:
                    await send_all(room,{'type':'error','message':'The host has closed the room.'})
                    rooms.pop(code,None)
                room['peers'].pop(seat,None)
                await broadcast_roster(room)
                break
            if kind=='profile' and not room['started']:
                # Name cannot be edited; only tank class is user-selectable.
                tank=str(data.get('tank','scout'))
                room['peers'][seat]['tank']=tank if tank in {'scout','titan','artillery','guardian'} else 'scout'
                await broadcast_roster(room)
            elif kind=='ally_request' and not room['started']:
                target=data.get('target',-1)
                if type(target) is not int:continue
                if target!=-1 and (target not in room['peers'] or target==seat):continue
                room['peers'][seat]['request']=target
                await broadcast_roster(room)
            elif kind=='start' and seat==0 and not room['started'] and len(room['peers'])+room['bots']>=2 and all(p.get('ws') is not None and not p['ws'].closed for p in room['peers'].values()):
                old_peers=[p for _,p in sorted(room['peers'].items())]
                old_to_new={p['slot']['seat']:i for i,p in enumerate(old_peers)}
                for i,p in enumerate(old_peers):
                    old=p['request']
                    p['request']=old_to_new.get(old,-1)
                    p['slot']['seat']=i
                room['peers']={i:p for i,p in enumerate(old_peers)}
                room['started_players']=len(old_peers)+room['bots']
                room['started']=True
                for i,p in enumerate(old_peers):
                    await send(p['ws'],{'type':'welcome','code':code,'seat':i,'name':p['name'],
                                        'maxPlayers':room['limit'],'maxRounds':room['rounds'],'bots':room['bots']})
                await broadcast_roster(room)
            elif kind=='reset' and seat==0:
                room['started']=False
                await broadcast_roster(room)
            elif kind=='state' and seat==0 and room['started']:
                game=data.get('game')
                if not isinstance(game,dict) or not isinstance(game.get('players'),list) or len(game['players'])!=room.get('started_players',0):continue
                room['last_state']={'game':game,'endText':str(data.get('endText',''))[:150]}
                await asyncio.gather(*(send(p['ws'],{'type':'state',**room['last_state']}) for s,p in list(room['peers'].items()) if s!=0))
            elif kind=='action' and seat!=0 and room['started']:
                a=data.get('action',{})
                if not isinstance(a,dict) or a.get('kind') not in {'aim','move','weapon','fire'}:continue
                if a.get('kind')=='aim' and (a.get('key') not in ('angle','power') or type(a.get('value')) not in (int,float)):continue
                if a.get('kind')=='move' and a.get('dir') not in [-1,1]:continue
                if a.get('kind')=='weapon' and str(a.get('id')) not in {'shell','heavy','napalm','cluster','digger','nuke','salvo','bunker','emp'}:continue
                await send(room['peers'][0]['ws'],{'type':'action','seat':seat,'action':a})
    finally:
        seat=slot['seat']
        # A transient mobile network loss must NOT erase the player's seat or
        # destroy the room. The original token + code can reclaim the seat.
        if room['peers'].get(seat,{}).get('ws') is ws:
            room['peers'][seat]['ws']=None
            room['peers'][seat]['disconnected_at']=time.time()
            if rooms.get(code) is room:await broadcast_roster(room)
    return ws

async def health(req):
    return web.json_response({'ok':True,'version':'1.1','active_rooms':len(rooms),'max_seats':6})

async def cleanup(app):
    while True:
        await asyncio.sleep(20)
        for c,r in list(rooms.items()):
            host=r['peers'].get(0)
            host_absent=(host is None or (host.get('disconnected_at') is not None
                and time.time()-host['disconnected_at']>RECONNECT_GRACE))
            if time.time()-r['created']>=TTL or host_absent:
                await send_all(r,{'type':'error','message':'Room expired or host did not reconnect within five minutes.'})
                for p in list(r['peers'].values()):
                    if p.get('ws') is not None:await p['ws'].close()
                rooms.pop(c,None)
            elif not r['started']:
                # An absent guest can leave an unstarted lobby after grace time.
                for seat,p in list(r['peers'].items()):
                    if seat!=0 and p.get('disconnected_at') is not None and time.time()-p['disconnected_at']>RECONNECT_GRACE:
                        r['peers'].pop(seat,None)
                await broadcast_roster(r)

async def lifecycle(app):
    task=asyncio.create_task(cleanup(app))
    yield
    task.cancel()
    try:await task
    except asyncio.CancelledError:pass

app=web.Application(client_max_size=MAX_MESSAGE)
app.router.add_get('/',lambda req:web.FileResponse(PUBLIC/'index.html',headers={'Cache-Control':'no-store'}))
app.router.add_get('/health',health)
app.router.add_get('/impressum',lambda req:web.FileResponse(PUBLIC/'legal.html',headers={'Cache-Control':'no-store'}))
app.router.add_get('/datenschutz',lambda req:web.FileResponse(PUBLIC/'privacy.html',headers={'Cache-Control':'no-store'}))
app.router.add_get('/ws',ws_handler)
app.router.add_static('/',PUBLIC,show_index=False)
app.cleanup_ctx.append(lifecycle)

if __name__=='__main__':
    port=int(os.environ.get('PORT','8765'))
    print(f'KRATERKRACH 1.1 multiplayer: http://0.0.0.0:{port}',flush=True)
    web.run_app(app,host='0.0.0.0',port=port,print=None)
