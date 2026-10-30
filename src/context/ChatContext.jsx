/* Actualización del inbox con recuperación al volver a la ventana, como el
   chat de ONG; usa la sesión y API de Bandidos. Sin cache compartida entre usuarios. */
/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { apiRequest } from '../services/apiClient';

const ChatContext=createContext(null);
export function ChatProvider({children}){
  const {user}=useAuth();
  const identity=user && user.role!=='super_admin' ? `${user.tenant_id}/${user.id}` : '';
  // employee_active=false applies only to a linked employee.
  const enabled=Boolean(user && user.role!=='super_admin' && (!user.employee_id || user.employee_active!==false) && (!user.chofer_id || user.chofer_activo!==false));
  const [inbox,setInbox]=useState({identity:'',items:[],error:''});
  const [revision,setRevision]=useState(0);
  const refresh=useCallback(()=>setRevision(v=>v+1),[]);
  useEffect(()=>{
    if(!enabled) return;
    let alive=true,loading=false;
    async function load(){
      if(loading || document.visibilityState==='hidden') return;
      loading=true;
      try{const items=await apiRequest('/v2/chat');if(alive)setInbox({identity,items,error:''});}
      catch(e){if(alive)setInbox(v=>({identity,items:v.identity===identity?v.items:[],error:e.message}));}
      finally{loading=false;}
    }
    void load();
    const timer=setInterval(load,15000);
    window.addEventListener('focus',load);document.addEventListener('visibilitychange',load);
    return()=>{alive=false;clearInterval(timer);window.removeEventListener('focus',load);document.removeEventListener('visibilitychange',load);};
  },[enabled,identity,revision]);
  const items=enabled && inbox.identity===identity?inbox.items:[];
  return <ChatContext.Provider value={{items,error:inbox.identity===identity?inbox.error:'',loading:enabled && inbox.identity!==identity,refresh,unread:items.reduce((n,c)=>n+(c.muted?0:c.unread),0)}}>{children}</ChatContext.Provider>;
}
export const useChatInbox=()=>useContext(ChatContext);
