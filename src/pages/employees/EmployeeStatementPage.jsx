// Adaptado de MiPagoPage y AnticiposPage de AppTzReactChofer. El servidor
// calcula el saldo; el navegador solo presenta trabajos y movimientos.
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiRequest } from '../../services/apiClient';
import { monthBoundsISO, todayISO } from '../../utils/dates';
import '../../styles/employee-portal.css';

const money=new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS'});
const fmt=(n)=>money.format(Number(n||0));
const day=(v)=>String(v).slice(0,10).split('-').reverse().join('/');

function PaymentForm({employeeId,start,onSaved}) {
  const [form,setForm]=useState({kind:'anticipo',date:todayISO(),amount:'',method:'transferencia',notes:''});
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  const operationId=useRef(null);
  function change(e){setForm(v=>({...v,[e.target.name]:e.target.value}));operationId.current=null;}
  async function submit(e){
    e.preventDefault();setBusy(true);setError('');
    operationId.current ||= crypto.randomUUID();
    try{
      await apiRequest(`/v2/employees/${employeeId}/payments`,{method:'POST',body:{...form,id:operationId.current,amount:Number(form.amount)}});
      operationId.current=null;setForm(v=>({...v,amount:'',notes:''}));await onSaved();
    }catch(e){setError(e.message);}finally{setBusy(false);}
  }
  return <form className="card portal-section" onSubmit={submit}>
    <h2 className="card-title">Registrar dinero entregado</h2>
    <p className="card-subtitle">Los anticipos y pagos reducen el saldo pendiente. Registrá cada entrega una sola vez.</p>
    <fieldset disabled={busy} className="portal-fields">
      <label className="form-field"><span>Tipo</span><select aria-label="Tipo de entrega" name="kind" value={form.kind} onChange={change}><option value="anticipo">Anticipo</option><option value="pago">Pago de liquidación</option></select></label>
      <label className="form-field"><span>Fecha</span><input required type="date" name="date" min={start} max={todayISO()} value={form.date} onChange={change}/></label>
      <label className="form-field"><span>Importe</span><input required type="number" name="amount" min="0.01" step="0.01" max="999999999" inputMode="decimal" value={form.amount} onChange={change}/></label>
      <label className="form-field"><span>Medio</span><select aria-label="Medio de entrega" name="method" value={form.method} onChange={change}><option value="transferencia">Transferencia</option><option value="efectivo">Efectivo</option><option value="otro">Otro</option></select></label>
      <label className="form-field portal-wide"><span>Observación</span><input name="notes" maxLength={1000} value={form.notes} onChange={change}/></label>
      <button className="btn-primary" type="submit">{busy?'Guardando…':'Registrar entrega'}</button>
    </fieldset>
    {error && <p role="alert" className="portal-error">{error}</p>}
  </form>;
}

function PayrollConfig({employee,onSaved}){
  const [start,setStart]=useState(employee.payroll_start_date),[opening,setOpening]=useState(employee.opening_balance);
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  return <details className="card portal-section"><summary>Inicio de la liquidación y saldo anterior</summary>
    <p>Elegí desde cuándo contar los trabajos y cuánto quedaba pendiente antes de esa fecha. Una vez que registres movimientos, esta configuración se conserva.</p>
    <form onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');try{
      await apiRequest(`/v2/employees/${employee.id}/payroll-config`,{method:'PUT',body:{payroll_start_date:start,opening_balance:Number(opening)}});await onSaved();
    }catch(e){setError(e.message);}finally{setBusy(false);}}}>
      <fieldset disabled={busy} className="portal-fields">
        <label className="form-field"><span>Contar trabajos desde</span><input required type="date" value={start} onChange={e=>setStart(e.target.value)}/></label>
        <label className="form-field"><span>Saldo inicial a favor del empleado</span><input required type="number" step="0.01" min="-999999999" max="999999999" value={opening} onChange={e=>setOpening(e.target.value)}/></label>
        <button type="submit" className="btn-secondary">{busy?'Guardando…':'Guardar inicio'}</button>
      </fieldset>
      {error && <p role="alert" className="portal-error">{error}</p>}
    </form>
  </details>;
}

export default function EmployeeStatementPage(){
  const {id}=useParams();
  const admin=Boolean(id),base=id?`/v2/employees/${id}/statement`:'/v2/me/employee';
  const [month,setMonth]=useState(()=>todayISO().slice(0,7)),[tab,setTab]=useState('works');
  const [state,setState]=useState({key:'',data:null,error:''}),[busy,setBusy]=useState(false);
  const [voiding,setVoiding]=useState(null),[reason,setReason]=useState(''),[actionError,setActionError]=useState('');
  const request=useRef(0);
  const key=`${base}/${month}`;
  const refresh=useCallback(async()=>{
    const current=++request.current;
    try{
      const {first,last}=monthBoundsISO(`${month}-01`);
      const data=await apiRequest(base,{params:{from:first,to:last}});
      if(current===request.current) setState({key:`${base}/${month}`,data,error:''});
    }catch(e){if(current===request.current)setState({key:`${base}/${month}`,data:null,error:e.message});}
  },[base,month]);
  useEffect(()=>{const currentRequest=request;void refresh();return()=>{currentRequest.current++;};},[refresh]);
  const data=state.key===key?state.data:null,error=state.key===key?state.error:'';
  return <div className="page-content employee-portal">
    <header className="page-header"><div><h1 className="page-title">{admin?'Liquidación del equipo':'Mi cuenta'}</h1><p className="page-subtitle">{data?.employee.name || 'Trabajos, anticipos y pagos'}</p></div>
      <label className="form-field"><span>Mes</span><input type="month" required value={month} onChange={e=>{if(e.target.value)setMonth(e.target.value);}}/></label>
    </header>
    <div className="portal-toolbar">{admin?<Link to={`/employees/${id}`}>Volver al empleado</Link>:<Link to="/chat">Conversar con el equipo</Link>}<button className="btn-secondary" onClick={refresh}>Actualizar</button></div>
    {error && <div className="card portal-error" role="alert">{error}</div>}
    {!data && !error && <p role="status">Cargando tu liquidación…</p>}
    {data && <>
      <p className="portal-note">Liquidación desde el {day(data.employee.payroll_start_date)}. Los trabajos anteriores se muestran como historial. El saldo incluye lo pendiente de meses anteriores.</p>
      <div className="portal-stats">
        {[['Saldo anterior',data.summary.opening],['Comisiones del mes',data.summary.earned],['Anticipos del mes',data.summary.advances],['Pagos del mes',data.summary.paid],['Pendiente al cierre del mes',data.summary.balance]].map(([label,value])=><article className="card" key={label}><span>{label}</span><strong>{fmt(value)}</strong></article>)}
      </div>
      {data.summary.balance<0 && <p className="portal-note">Las entregas superan lo generado. Ese importe queda a cuenta de próximos trabajos.</p>}
      {data.summary.missing_prices>0 && <p className="portal-note">Hay {data.summary.missing_prices} trabajos sin precio registrado. Su comisión queda pendiente de confirmar y todavía no se suma al saldo.</p>}
      {data.summary.historical_estimates>0 && <p className="portal-note">Hay {data.summary.historical_estimates} trabajos anteriores a esta función cuyo porcentaje se reconstruyó con el valor vigente al incorporarlos. Administración puede revisar el saldo inicial.</p>}
      <nav className="portal-tabs" aria-label="Detalle de mi cuenta">
        <button className={tab==='works'?'active':''} onClick={()=>setTab('works')}>Mis trabajos ({data.works.length})</button>
        <button className={tab==='advances'?'active':''} onClick={()=>setTab('advances')}>Anticipos ({data.summary.advance_count})</button>
        <button className={tab==='payments'?'active':''} onClick={()=>setTab('payments')}>Todos los pagos</button>
      </nav>
      <section className="card portal-section">
        {tab==='works'?<>
          <h2 className="card-title">{admin?'Trabajos realizados':'Mis trabajos realizados'}</h2>
          <p className="card-subtitle">La comisión se genera al finalizar el trabajo. En trabajos compartidos se reparte el porcentaje de la peluquera principal.</p>
          {!data.works.length?<p>No hay trabajos finalizados en este mes.</p>:<div className="portal-table"><table><thead><tr><th>Fecha</th><th>Mascota / servicio</th><th>Precio del servicio</th><th>Participación</th><th>Comisión generada</th></tr></thead><tbody>
            {data.works.map(w=><tr key={w.id}><td>{day(w.date)}{w.date<data.employee.payroll_start_date && <small>Solo historial</small>}</td><td>{w.pet_name}<small>{w.service_name || 'Servicio'}</small></td><td>{w.price==null?"A confirmar":fmt(w.price)}</td><td>{w.participants>1?`Compartido entre ${w.participants}`:'Individual'}<small>{Number(w.commission_rate_snapshot)*100}% del servicio</small></td><td><strong>{w.price==null?"A confirmar":fmt(w.earned)}</strong>{w.commission_historical_estimate && <small>Porcentaje histórico estimado</small>}</td></tr>)}
          </tbody></table></div>}
        </>:<>
          <h2 className="card-title">{tab==='advances'?'Anticipos recibidos':'Entregas registradas'}</h2>
          <p className="card-subtitle">Administración registra las entregas. Los movimientos anulados se conservan para poder revisarlos.</p>
          {!data.payments.filter(p=>tab!=='advances'||p.kind==='anticipo').length && <p>No hay movimientos en este mes.</p>}
          {data.payments.filter(p=>tab!=='advances'||p.kind==='anticipo').map(p=><article key={p.id} className={`portal-movement ${p.voided_at?'voided':''}`}>
            <div><strong>{p.kind==='anticipo'?'Anticipo':'Pago de liquidación'} · {fmt(p.amount)}</strong><p>{day(p.date)} · {p.method}</p>{p.notes && <p>{p.notes}</p>}{p.voided_at && <p>Anulado: {p.void_reason}</p>}</div>
            {admin && !p.voided_at && <button className="btn-secondary" disabled={busy} onClick={()=>{setVoiding(p.id);setReason('');setActionError('');}}>Anular</button>}
          </article>)}
        </>}
      </section>
      {voiding && <form className="card portal-section" onSubmit={async e=>{e.preventDefault();setBusy(true);setActionError('');try{await apiRequest(`/v2/employees/${id}/payments/${voiding}/void`,{method:'POST',body:{reason}});setVoiding(null);await refresh();}catch(e){setActionError(e.message);}finally{setBusy(false);}}}>
        <label className="form-field"><span>Motivo de la anulación</span><input required maxLength={500} value={reason} disabled={busy} onChange={e=>setReason(e.target.value)}/></label>
        <div className="portal-toolbar"><button className="btn-danger" disabled={busy}>Confirmar anulación</button><button type="button" className="btn-secondary" disabled={busy} onClick={()=>setVoiding(null)}>Cancelar</button></div>
        {actionError && <p role="alert">{actionError}</p>}
      </form>}
      {admin && <><PaymentForm key={id} employeeId={id} start={data.employee.payroll_start_date} onSaved={refresh}/><PayrollConfig key={`${id}/${data.employee.payroll_start_date}/${data.employee.opening_balance}`} employee={data.employee} onSaved={refresh}/></>}
    </>}
  </div>;
}
