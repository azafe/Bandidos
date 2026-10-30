import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useChatInbox } from '../../context/ChatContext';
import { apiRequest } from '../../services/apiClient';
import { etiquetaDia, horaMensaje, horaLista, mismoDia } from '../../lib/chatFormat';
import '../../styles/team-chat.css';

const emojis=['👍','❤️','😂','😮','😢','✅'];
const route=(id)=>`/v2/chat/${id}`;

async function preparePhoto(file){
  if(file.size>20*1024*1024)throw new Error('Elegí una foto de hasta 20 MB.');
  let bitmap;
  try{bitmap=await createImageBitmap(file);}catch{throw new Error('No se pudo abrir la foto. Usá JPEG, PNG o WebP.');}
  try{
    const scale=Math.min(1,1400/Math.max(bitmap.width,bitmap.height));
    const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
    canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);
    const url=canvas.toDataURL('image/jpeg',0.75),data=url.split(',')[1];
    if(data.length>1398000)throw new Error('La foto sigue siendo muy grande. Elegí una más pequeña.');
    return {data,type:'image/jpeg'};
  }finally{bitmap.close();}
}

function Photo({chatId,messageId}){
  const [url,setUrl]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  return <div>{url?<a href={url} target="_blank" rel="noreferrer"><img className="chat-photo" src={url} alt="Foto enviada al equipo"/></a>:<button className="chat-inline" disabled={busy} onClick={async()=>{setBusy(true);setError('');try{const p=await apiRequest(`${route(chatId)}/messages/${messageId}/photo`);setUrl(p.url);}catch(e){setError(e.message);}finally{setBusy(false);}}}>{busy?'Cargando foto…':'Ver foto'}</button>}{error && <p role="alert">{error}</p>}</div>;
}

function NewChat({onClose,onCreated}){
  const {user}=useAuth();
  const [people,setPeople]=useState(null),[kind,setKind]=useState('directa'),[name,setName]=useState(''),[ids,setIds]=useState([]);
  const [error,setError]=useState(''),[busy,setBusy]=useState(false),[retry,setRetry]=useState(0);
  const op=useRef(null);
  useEffect(()=>{let alive=true;apiRequest('/v2/chat/people').then(p=>{if(alive)setPeople(p);}).catch(e=>{if(alive)setError(e.message);});return()=>{alive=false;};},[retry]);
  return <div className="chat-dialog-backdrop"><section className="card chat-dialog" role="dialog" aria-modal="true" aria-labelledby="new-chat-title">
    <h2 id="new-chat-title">Nueva conversación</h2>
    <form onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');op.current ||= crypto.randomUUID();try{
      const result=await apiRequest('/v2/chat',{method:'POST',body:{id:op.current,kind,name,members:ids}});onCreated(result.id);
    }catch(e){setError(e.message);}finally{setBusy(false);}}}>
      <fieldset disabled={busy} className="chat-form">
        <label className="form-field"><span>Tipo</span><select aria-label="Tipo de conversación" value={kind} onChange={e=>{setKind(e.target.value);setIds([]);op.current=null;}}><option value="directa">Conversación privada</option><option value="grupo">Grupo del equipo</option></select></label>
        {kind==='grupo' && <label className="form-field"><span>Nombre del grupo</span><input autoFocus required maxLength={60} value={name} onChange={e=>{setName(e.target.value);op.current=null;}}/></label>}
        {!people && <p role="status">Cargando equipo…</p>}
        {people?.length===0 && <p>No hay otras cuentas activas. Administración puede crearlas desde Usuarios.</p>}
        <div className="chat-person-list">{people?.filter(p=>p.id!==user.id).map(p=><label key={p.id}><input type={kind==='grupo'?'checkbox':'radio'} name="chat-person" checked={ids.includes(p.id)} onChange={e=>{setIds(v=>kind==='directa'?[p.id]:e.target.checked?[...v,p.id]:v.filter(id=>id!==p.id));op.current=null;}}/><span>{p.name}<small>{p.role==='admin'?'Administración':'Equipo'}</small></span></label>)}</div>
        <div className="chat-actions"><button className="btn-secondary" type="button" onClick={onClose}>Cancelar</button><button className="btn-primary" disabled={!ids.length || !people}>Abrir conversación</button></div>
      </fieldset>
      {error && <p role="alert" className="chat-error">{error}{!people && <button type="button" onClick={()=>setRetry(v=>v+1)}>Reintentar</button>}</p>}
    </form>
  </section></div>;
}

function GroupMembers({id,detail,onClose,onSaved}){
  const [people,setPeople]=useState(null),[ids,setIds]=useState(detail.members.map(m=>m.user_id));
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  const {user}=useAuth();
  useEffect(()=>{let alive=true;apiRequest('/v2/chat/people').then(p=>{if(alive)setPeople(p);}).catch(e=>{if(alive)setError(e.message);});return()=>{alive=false;};},[]);
  const choices=people?[...people,...detail.members.filter(m=>m.user_id!==user.id && !people.some(p=>p.id===m.user_id)).map(m=>({id:m.user_id,name:m.name+' (sin acceso activo)'}))]:[];
  return <div className="chat-dialog-backdrop"><section className="card chat-dialog" role="dialog" aria-modal="true" aria-labelledby="members-title"><h2 id="members-title">Participantes del grupo</h2><p>Las personas que se agregan ven los mensajes enviados desde su ingreso.</p>
    {detail.is_admin?<form onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');try{await apiRequest(`${route(id)}/members`,{method:'PUT',body:{members:ids}});onSaved();}catch(e){setError(e.message);}finally{setBusy(false);}}}>
      <fieldset disabled={busy} className="chat-form"><div className="chat-person-list">{choices.map(p=><label key={p.id}><input type="checkbox" checked={ids.includes(p.id)} onChange={e=>setIds(v=>e.target.checked?[...v,p.id]:v.filter(id=>id!==p.id))}/>{p.name}</label>)}</div><p>Tu cuenta permanece como administradora.</p><div className="chat-actions"><button type="button" className="btn-secondary" onClick={onClose}>Cerrar</button><button className="btn-primary" disabled={!people || ids.length<2}>Guardar participantes</button></div></fieldset>
    </form>:<><ul>{detail.members.map(m=><li key={m.user_id}>{m.name}</li>)}</ul><button className="btn-secondary" onClick={onClose}>Cerrar</button></>}
    {error && <p role="alert" className="chat-error">{error}</p>}
  </section></div>;
}

function Conversation({id,name,onBack}){
  const {user}=useAuth(),inbox=useChatInbox();
  const refreshInbox=inbox.refresh;
  const [data,setData]=useState(null),[error,setError]=useState(''),[draft,setDraft]=useState(''),[photo,setPhoto]=useState(null);
  const [busy,setBusy]=useState(false),[photoBusy,setPhotoBusy]=useState(false),[actionError,setActionError]=useState('');
  const [pages,setPages]=useState(1),[search,setSearch]=useState(''),[searchInput,setSearchInput]=useState('');
  const [edit,setEdit]=useState(null),[editText,setEditText]=useState(''),[confirmDelete,setConfirmDelete]=useState(null),[membersOpen,setMembersOpen]=useState(false);
  const [revision,setRevision]=useState(0);
  const op=useRef(null),scroller=useRef(null),bottom=useRef(null),stick=useRef(true),lastRead=useRef('0');
  const refresh=useCallback(()=>{setRevision(v=>v+1);refreshInbox();},[refreshInbox]);
  useEffect(()=>{
    let alive=true,loading=false;
    async function load(){
      if(loading || document.visibilityState==='hidden')return;
      loading=true;
      try{
        const detail=await apiRequest(route(id));
        let before,messages=[],hasMore=false;
        for(let page=0;page<pages;page++){
          const batch=await apiRequest(`${route(id)}/messages`,{params:{before,search:search||undefined}});
          messages=[...batch.messages,...messages];hasMore=batch.has_more;before=batch.before;if(!hasMore)break;
        }
        if(alive){setData({detail,messages,hasMore,search});setError('');}
      }catch(e){if(alive){setError(e.message);if([403,404].includes(e.status))setData(null);}}
      finally{loading=false;}
    }
    void load();const timer=setInterval(load,5000);
    window.addEventListener('focus',load);document.addEventListener('visibilitychange',load);
    return()=>{alive=false;clearInterval(timer);window.removeEventListener('focus',load);document.removeEventListener('visibilitychange',load);};
  },[id,pages,search,revision]);
  useEffect(()=>{if(stick.current && scroller.current && !search)scroller.current.scrollTop=scroller.current.scrollHeight;},[data,search]);
  useEffect(()=>{
    const last=data?.messages.at(-1);
    if(!last || search || !bottom.current || !scroller.current)return;
    let alive=true;
    async function mark(){
      if(document.visibilityState==='hidden' || BigInt(last.seq)<=BigInt(lastRead.current))return;
      const box=bottom.current?.getBoundingClientRect(),parent=scroller.current?.getBoundingClientRect();
      if(!box || !parent || box.bottom>parent.bottom+2 || box.top<parent.top)return;
      try{await apiRequest(`${route(id)}/read`,{method:'POST',body:{through:last.seq}});if(alive){lastRead.current=last.seq;refreshInbox();}}catch{/* El siguiente ciclo vuelve a intentar. */}
    }
    const observer=new IntersectionObserver(entries=>{if(entries[0]?.isIntersecting)void mark();},{root:scroller.current,threshold:1});
    observer.observe(bottom.current);document.addEventListener('visibilitychange',mark);
    return()=>{alive=false;observer.disconnect();document.removeEventListener('visibilitychange',mark);};
  },[data,id,search,refreshInbox]);
  async function action(fn){setBusy(true);setActionError('');try{await fn();refresh();}catch(e){setActionError(e.message);}finally{setBusy(false);}}
  async function send(e){
    e.preventDefault();if(!draft.trim()&&!photo)return;
    op.current ||= crypto.randomUUID();
    await action(async()=>{await apiRequest(`${route(id)}/messages`,{method:'POST',body:{id:op.current,text:draft.trim()||null,...(photo?{photo}:{})}});op.current=null;setDraft('');setPhoto(null);stick.current=true;});
  }
  const chat=inbox.items.find(c=>c.id===id),messages=data?.search===search?data.messages:[];
  return <section className="chat-conversation" aria-label={`Conversación con ${name}`}>
    <header className="chat-conversation-header"><button type="button" className="chat-back" onClick={onBack} aria-label="Volver a conversaciones">←</button><div><h2>{name}</h2><small>{data?.detail.kind==='grupo'?`${data.detail.members.length} participantes`:'Conversación privada'}</small></div>
      {data?.detail.kind==='grupo' && <button className="chat-inline" onClick={()=>setMembersOpen(true)}>Participantes</button>}
      {chat && <><button className="chat-inline" aria-label={chat.favorite?'Quitar favorito':'Marcar favorito'} onClick={()=>action(()=>apiRequest(`${route(id)}/preferences`,{method:'PATCH',body:{favorite:!chat.favorite}}))}>{chat.favorite?'★':'☆'}</button><button className="chat-inline" disabled={busy} onClick={()=>action(()=>apiRequest(`${route(id)}/preferences`,{method:'PATCH',body:{muted:!chat.muted}}))}>{chat.muted?'Activar avisos':'Silenciar'}</button></>}
    </header>
    <form className="chat-search" onSubmit={e=>{e.preventDefault();setPages(1);setSearch(searchInput.trim());}}><input type="search" aria-label="Buscar en la conversación" placeholder="Buscar un mensaje…" maxLength={100} value={searchInput} onChange={e=>setSearchInput(e.target.value)}/><button className="chat-inline">Buscar</button>{search && <button type="button" className="chat-inline" onClick={()=>{setSearch('');setSearchInput('');setPages(1);}}>Limpiar</button>}</form>
    {error && <p role="alert" className="chat-error">{error} <button className="chat-inline" onClick={refresh}>Reintentar</button></p>}
    <div className="chat-messages" ref={scroller} onScroll={()=>{const el=scroller.current;stick.current=el.scrollHeight-el.scrollTop-el.clientHeight<90;}}>
      {!data && !error && <p role="status">Cargando conversación…</p>}
      {data?.hasMore && <button className="chat-inline chat-load" onClick={()=>{stick.current=false;setPages(v=>v+1);}}>Ver mensajes anteriores</button>}
      {data && !messages.length && <p className="chat-empty">{search?'No se encontraron mensajes.':'Todavía no hay mensajes. Podés iniciar la conversación.'}</p>}
      {messages.map((m,index)=>{
        const mine=m.author_id===user.id;
        const readBy=data.detail.members.filter(p=>p.user_id!==user.id && BigInt(p.read_seq)>=BigInt(m.seq));
        return <div key={m.id}>
          {(index===0||!mismoDia(messages[index-1].created_at,m.created_at)) && <p className="chat-day">{etiquetaDia(m.created_at)}</p>}
          <article className={`chat-bubble ${mine?'mine':''} ${m.deleted_at?'deleted':''}`}>
            {!mine && <strong className="chat-author">{m.author_name}</strong>}
            {m.deleted_at?<p>Mensaje eliminado</p>:<>
              {m.text && <p className="chat-text">{m.text}</p>}
              {m.has_photo && <Photo chatId={id} messageId={m.id}/>}
              <div className="chat-reactions">{m.reactions.map(r=><button key={r.emoji} title={r.users.includes(user.id)?'Quitar mi reacción':'Reaccionar'} className={r.users.includes(user.id)?'selected':''} disabled={busy} onClick={()=>action(()=>apiRequest(`${route(id)}/messages/${m.id}/reaction`,{method:'PUT',body:{emoji:r.users.includes(user.id)?null:r.emoji}}))}>{r.emoji} {r.users.length}</button>)}</div>
              <details className="chat-message-options"><summary>Opciones</summary><div className="chat-actions">{emojis.map(emoji=><button key={emoji} className="chat-inline" disabled={busy} aria-label={`Reaccionar ${emoji}`} onClick={()=>action(()=>apiRequest(`${route(id)}/messages/${m.id}/reaction`,{method:'PUT',body:{emoji}}))}>{emoji}</button>)}
                {mine && Date.now()-Date.parse(m.created_at)<=15*60000 && <button className="chat-inline" disabled={busy} onClick={()=>{setEdit(m.id);setEditText(m.text||'');}}>Editar</button>}
                {(user.role==='admin'||(mine && Date.now()-Date.parse(m.created_at)<=24*3600000)) && <button className="chat-inline" disabled={busy} onClick={()=>setConfirmDelete(m.id)}>Eliminar</button>}
              </div></details>
            </>}
            <footer>{horaMensaje(m.created_at)}{m.edited_at?' · editado':''}{mine && !m.deleted_at?` · ${readBy.length?'Leído por '+readBy.length:'Enviado'}`:''}</footer>
          </article>
        </div>;
      })}<div ref={bottom} className="chat-bottom"/>
    </div>
    {actionError && <p className="chat-error" role="alert">{actionError}</p>}
    {confirmDelete && <div className="chat-confirm"><p>¿Eliminar este mensaje para todos los participantes?</p><button className="btn-danger" disabled={busy} onClick={()=>action(async()=>{await apiRequest(`${route(id)}/messages/${confirmDelete}`,{method:'DELETE'});setConfirmDelete(null);})}>Eliminar</button><button className="btn-secondary" disabled={busy} onClick={()=>setConfirmDelete(null)}>Cancelar</button></div>}
    {edit && <form className="chat-compose" onSubmit={e=>{e.preventDefault();action(async()=>{await apiRequest(`${route(id)}/messages/${edit}`,{method:'PATCH',body:{text:editText}});setEdit(null);});}}><label className="form-field"><span>Editar mensaje</span><textarea required maxLength={4000} value={editText} disabled={busy} onChange={e=>setEditText(e.target.value)}/></label><button className="btn-primary" disabled={busy}>Guardar</button><button className="btn-secondary" type="button" onClick={()=>setEdit(null)}>Cancelar</button></form>}
    {!edit && <form className="chat-compose" onSubmit={send}>
      {photo && <div className="chat-photo-preview"><img src={`data:${photo.type};base64,${photo.data}`} alt="Foto que vas a enviar"/><button type="button" className="chat-inline" disabled={busy} onClick={()=>{setPhoto(null);op.current=null;}}>Quitar foto</button></div>}
      <div className="chat-compose-row"><label className="chat-attach"><span>{photoBusy?'Preparando…':'＋ Foto'}</span><input type="file" accept="image/jpeg,image/png,image/webp" aria-label="Adjuntar una foto" disabled={busy||photoBusy||!data} onChange={async e=>{const file=e.target.files?.[0];e.target.value='';if(!file)return;setPhotoBusy(true);setActionError('');try{setPhoto(await preparePhoto(file));op.current=null;}catch(e){setActionError(e.message);}finally{setPhotoBusy(false);}}}/></label>
        <textarea aria-label="Mensaje" placeholder="Escribí al equipo…" maxLength={4000} rows={2} value={draft} disabled={busy||!data} onChange={e=>{setDraft(e.target.value);op.current=null;}}/>
        <button type="submit" className="btn-primary" disabled={busy||photoBusy||!data||(!draft.trim()&&!photo)}>{busy?'Enviando…':'Enviar'}</button>
      </div>
    </form>}
    {membersOpen && data && <GroupMembers id={id} detail={data.detail} onClose={()=>setMembersOpen(false)} onSaved={()=>{setMembersOpen(false);refresh();}}/>}
  </section>;
}

export default function ChatPage(){
  const inbox=useChatInbox();
  const [selected,setSelected]=useState(null),[newChat,setNewChat]=useState(false),[filter,setFilter]=useState('');
  const active=inbox.items.find(c=>c.id===selected);
  return <div className="page-content team-chat"><header className="page-header"><div><h1 className="page-title">Chat del equipo</h1><p className="page-subtitle">Conversaciones privadas y grupos de Bandidos.</p></div><button className="btn-primary" onClick={()=>setNewChat(true)}>Nueva conversación</button></header>
    <div className={`chat-layout ${selected?'chat-has-selection':''}`}>
      <aside className="card chat-inbox"><label className="chat-search"><input aria-label="Buscar conversación" placeholder="Buscar conversación…" value={filter} onChange={e=>setFilter(e.target.value)}/></label>
        {inbox.loading && <p role="status">Cargando chats…</p>}{inbox.error && <p className="chat-error" role="alert">{inbox.error} <button className="chat-inline" onClick={inbox.refresh}>Reintentar</button></p>}
        {!inbox.loading && !inbox.items.length && <p className="chat-empty">Abrí una conversación para coordinar con tu equipo.</p>}
        {inbox.items.filter(c=>c.name.toLocaleLowerCase('es').includes(filter.toLocaleLowerCase('es'))).map(c=><button key={c.id} className={`chat-inbox-item ${selected===c.id?'active':''}`} onClick={()=>setSelected(c.id)}><span className="chat-avatar">{c.kind==='grupo'?'#':c.name.slice(0,1).toUpperCase()}</span><span className="chat-inbox-copy"><strong>{c.favorite?'★ ':''}{c.name}</strong><small>{c.last_deleted_at?'Mensaje eliminado':c.last_has_photo?'Foto':c.last_text || 'Sin mensajes'}</small></span><span className="chat-inbox-meta"><small>{horaLista(c.updated_at)}</small>{c.unread>0 && <b className={c.muted?'muted':''}>{c.unread}</b>}</span></button>)}
      </aside>
      {selected?<Conversation key={selected} id={selected} name={active?.name||'Conversación'} onBack={()=>setSelected(null)}/>:<section className="card chat-welcome"><span>✉</span><h2>Tu equipo, en contacto</h2><p>Elegí una conversación o iniciá una nueva.</p></section>}
    </div>
    {newChat && <NewChat onClose={()=>setNewChat(false)} onCreated={id=>{setNewChat(false);setSelected(id);inbox.refresh();}}/>}
  </div>;
}
