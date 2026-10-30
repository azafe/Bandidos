// Adaptado de MiPagoPage y AnticiposPage de AppTzReactChofer. El servidor
// calcula el saldo; el navegador solo presenta trabajos y movimientos.
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiRequest } from '../../services/apiClient';
import { monthBoundsISO, todayISO, addMonthsISO, formatMonthLabel } from '../../utils/dates';
import { employeeStatementActivity } from '../../lib/employeeStatement';
import ResponsiveTable from '../../components/ui/ResponsiveTable';
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
  const activity=data?employeeStatementActivity(data):null;
  const monthLabel=formatMonthLabel(`${month}-01`);
  const workColumns=[
    {label:'Mascota / servicio',title:true,render:w=><div className="portal-work-name"><strong>{w.pet_name || 'Mascota'}</strong><span>{w.service_name || 'Servicio'}</span></div>},
    {label:'Fecha',render:w=><time dateTime={w.date}>{day(w.date)}</time>},
    {label:'Precio del servicio',align:'right',desktopOnly:!admin,render:w=>w.price==null?'A confirmar':fmt(w.price)},
    {label:'Reparto',desktopOnly:!admin,render:w=><span className="portal-work-share">{new Intl.NumberFormat('es-AR',{maximumFractionDigits:2}).format(Number(w.commission_rate_snapshot ?? 0.4)*100)}%{w.participants>1?` entre ${w.participants} personas`:''}{w.commission_historical_estimate && <small>Porcentaje estimado</small>}</span>},
    {label:admin?'Comisión generada':'Tu comisión',align:'right',highlight:true,render:w=><div className="portal-work-commission"><span>{admin?'Comisión':'Tu comisión'}</span><strong>{w.price==null?'A confirmar':fmt(w.earned)}</strong></div>},
  ];
  return <div className="page-content employee-portal">
    <header className="portal-header"><div><p className="portal-eyebrow">{admin?'Liquidación del equipo':'Mi cuenta'}</p><h1>{data?.employee.name || 'Trabajos y pagos'}</h1><p className="portal-header-caption">Tu actividad de {monthLabel.toLocaleLowerCase('es-AR')}</p></div>
      <div className="portal-period">
        <button type="button" aria-label="Mes anterior" onClick={()=>setMonth(v=>addMonthsISO(`${v}-01`,-1).slice(0,7))}>‹</button>
        <label className="form-field"><span>Mes de consulta</span><input aria-label="Mes de consulta" type="month" required value={month} onChange={e=>{if(e.target.value)setMonth(e.target.value);}}/></label>
        <button type="button" aria-label="Mes siguiente" onClick={()=>setMonth(v=>addMonthsISO(`${v}-01`,1).slice(0,7))}>›</button>
      </div>
    </header>
    <div className="portal-toolbar">{admin?<Link to={`/employees/${id}`}>Volver al empleado</Link>:<Link to="/chat">Conversar con el equipo</Link>}<button className="btn-secondary" onClick={refresh}>Actualizar</button></div>
    {error && <div className="card portal-error" role="alert">{error}</div>}
    {!data && !error && <p role="status">Cargando tu liquidación…</p>}
    {data && <>
      <section className="portal-activity" aria-label="Actividad del mes">
        <article className="card portal-earned"><h2>Comisiones del mes</h2><strong>{activity.count>0 && activity.missingPrices===activity.count?'A confirmar':fmt(activity.earned)}</strong><p>{monthLabel}</p>{activity.estimated>0 && <span className="portal-estimate">Contiene porcentajes estimados</span>}</article>
        <article className="card portal-work-count"><h2>Trabajos realizados</h2><strong>{activity.count}</strong><p>{activity.shared>0?`${activity.shared} compartido${activity.shared===1?'':'s'}`:'En el mes consultado'}</p></article>
      </section>
      {admin && <section className={`card portal-ledger ${activity.beforePayroll?'portal-ledger-pending':''}`} aria-label="Estado de pagos">
        <div className="portal-ledger-heading"><div><h2>{activity.beforePayroll?'Saldo de este período':activity.partialPayroll && activity.beforeStart>0?'Saldo registrado':'Saldo pendiente'}</h2><p>{activity.beforePayroll?'Requiere revisión de administración':`Registro de pagos desde el ${day(data.employee.payroll_start_date)}`}</p></div><strong>{activity.beforePayroll?'Por confirmar':fmt(data.summary.balance)}</strong></div>
        {activity.beforePayroll?<p className="portal-note">Los pagos se registran aquí desde el {day(data.employee.payroll_start_date)}. Administración debe confirmar cuánto quedó pendiente de {monthLabel.toLocaleLowerCase('es-AR')}. Las comisiones de todos los trabajos del mes se muestran arriba.</p>:<>
          <dl className="portal-ledger-breakdown">{[['Saldo anterior',data.summary.opening],['Anticipos registrados',data.summary.advances],['Pagos registrados',data.summary.paid]].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{fmt(value)}</dd></div>)}</dl>
          {activity.partialPayroll && activity.beforeStart>0 && <p className="portal-note">El saldo incluye los movimientos desde el {day(data.employee.payroll_start_date)}. Hay {activity.beforeStart} {activity.beforeStart===1?'trabajo anterior incluido':'trabajos anteriores incluidos'} en las comisiones del mes; su saldo previo debe estar confirmado por administración.</p>}
          {data.summary.balance<0 && <p className="portal-note">Las entregas superan lo generado en la liquidación. Ese importe queda a cuenta de próximos trabajos.</p>}
        </>}
      </section>}
      {activity.missingPrices>0 && <p className="portal-note">Hay {activity.missingPrices} trabajos sin precio registrado. Su comisión queda pendiente de confirmar y todavía no se suma al total.</p>}
      <nav className="portal-tabs" aria-label="Detalle de mi cuenta">
        <button aria-pressed={tab==='works'} className={tab==='works'?'active':''} onClick={()=>setTab('works')}>Trabajos <span>{data.works.length}</span></button>
        <button aria-pressed={tab==='advances'} className={tab==='advances'?'active':''} onClick={()=>setTab('advances')}>Anticipos <span>{data.summary.advance_count}</span></button>
        <button aria-pressed={tab==='payments'} className={tab==='payments'?'active':''} onClick={()=>setTab('payments')}>Pagos</button>
      </nav>
      <section className="card portal-section">
        {tab==='works'?<>
          <h2 className="card-title">{admin?'Trabajos realizados':'Mis trabajos realizados'}</h2>
          <p className="card-subtitle">{monthLabel} · {data.works.length} trabajos finalizados</p>
          <details className="portal-work-help"><summary>Cómo se calcula la comisión</summary><p>La comisión se genera al finalizar el trabajo. Si es compartido, se reparte en partes iguales el porcentaje de la peluquera principal.</p>{activity.estimated>0 && <p>En {activity.estimated} trabajos antiguos, el porcentaje se reconstruyó con el valor vigente al incorporar el historial. Administración puede revisarlo.</p>}</details>
          <div className="portal-work-list"><ResponsiveTable columns={workColumns} rows={data.works} rowKey={w=>w.id} empty="No hay trabajos finalizados en este mes."/></div>
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
