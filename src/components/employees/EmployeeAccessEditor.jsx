import { useState } from 'react';
import { apiRequest } from '../../services/apiClient';

export default function EmployeeAccessEditor({cuenta,empleados,disabled,onSaved}){
  const [mode,setMode]=useState(cuenta.employee_id?'personal':cuenta.chofer_id?'driver':'general');
  const [person,setPerson]=useState(cuenta.employee_id || cuenta.chofer_id || '');
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  return <section className="portal-section"><h3>Acceso de la cuenta</h3>
    <p>Una cuenta personal consulta sus trabajos, sus liquidaciones y el chat. Si la persona es chofer también puede operar sus traslados.</p>
    <fieldset disabled={disabled || busy} className="portal-fields">
      <label className="form-field"><span>Tipo de acceso</span><select aria-label="Tipo de acceso" value={mode} onChange={e=>{setMode(e.target.value);setPerson('');}}><option value="general">Acceso general según rol</option><option value="personal" disabled={cuenta.role==='admin'}>Cuenta personal del empleado</option>{cuenta.chofer_id && <option value="driver">Chofer existente</option>}</select></label>
      {mode!=='general' && <label className="form-field"><span>Empleado vinculado</span><select aria-label="Empleado vinculado" value={person} onChange={e=>setPerson(e.target.value)}><option value="">Elegí una persona</option>{empleados.filter(e=>e.id===person || (e.status==='active' && (mode!=='driver'||e.is_driver))).map(e=><option key={e.id} value={e.id}>{e.name} · {e.role}</option>)}</select></label>}
      <button type="button" className="btn-secondary" disabled={mode!=='general'&&!person} onClick={async()=>{
        if(mode==='general' && (cuenta.employee_id||cuenta.chofer_id) && !window.confirm('Esta cuenta recuperará el acceso general de su rol. ¿Querés quitar el acceso personal?'))return;
        setBusy(true);setError('');try{
          const driver=mode==='driver' || (mode==='general' && cuenta.chofer_id);
          const saved=await apiRequest(`/v2/users/${cuenta.id}/${driver?'chofer':'employee'}`,{method:'PUT',body:driver?{chofer_id:mode==='general'?null:person}:{employee_id:mode==='general'?null:person}});
          await onSaved(saved);
        }catch(e){setError(e.message);}finally{setBusy(false);}
      }}>{busy?'Guardando…':'Guardar acceso'}</button>
    </fieldset>{error && <p role="alert">{error}</p>}
  </section>;
}
