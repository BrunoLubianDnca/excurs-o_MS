import {
  AlertTriangle,
  ArrowRight,
  Bus,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  Clock3,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
  LogOut,
  MapPin,
  MapPinned,
  Menu,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { FormEvent, ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { CircleMarker, MapContainer, Polyline, TileLayer, Tooltip, useMap } from 'react-leaflet';
import { familyTripSlug, isSupabaseConfigured, supabase } from './supabase';
import type { FamilyTrip, Passenger, Screen, Transport, TripCost, TripTask } from './types';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const dateOnly = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC', day: '2-digit', month: 'short', year: 'numeric' });
const MS_TIME_ZONE = 'America/Campo_Grande';
const SC_TIME_ZONE = 'America/Sao_Paulo';

function formatDate(value: string | null) {
  if (!value) return 'A definir';
  return dateOnly.format(new Date(`${value}T12:00:00Z`)).replace('.', '');
}

function dateRange(trip: FamilyTrip) {
  return `${formatDate(trip.start_date)} — ${formatDate(trip.end_date)}`;
}

function cpfMask(value: string) {
  const digits = value.replace(/\D/g, '');
  if (digits.length !== 11) return value;
  return `${digits.slice(0, 3)}.***.***-${digits.slice(-2)}`;
}

function mapsUrl(trip: FamilyTrip) {
  const origin = encodeURIComponent(`${trip.origin.latitude},${trip.origin.longitude}`);
  const destination = encodeURIComponent(`${trip.destination.latitude},${trip.destination.longitude}`);
  return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;
}

function FitRoute({ trip }: { trip: FamilyTrip }) {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(
      [
        [trip.origin.latitude, trip.origin.longitude],
        [trip.destination.latitude, trip.destination.longitude],
      ],
      { padding: [34, 34] },
    );
  }, [map, trip]);
  return null;
}

function RouteMap({ trip }: { trip: FamilyTrip }) {
  const points: [number, number][] = [
    [trip.origin.latitude, trip.origin.longitude],
    [trip.destination.latitude, trip.destination.longitude],
  ];
  return (
    <div className="map-wrap">
      <MapContainer center={points[0]} zoom={6} scrollWheelZoom={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Polyline positions={points} pathOptions={{ color: '#d46139', weight: 4, dashArray: '8 8' }} />
        <CircleMarker center={points[0]} radius={9} pathOptions={{ color: '#fff', weight: 3, fillColor: '#264f46', fillOpacity: 1 }}>
          <Tooltip direction="top">Blumenau/SC</Tooltip>
        </CircleMarker>
        <CircleMarker center={points[1]} radius={9} pathOptions={{ color: '#fff', weight: 3, fillColor: '#d46139', fillOpacity: 1 }}>
          <Tooltip direction="top">Tacuru/MS</Tooltip>
        </CircleMarker>
        <FitRoute trip={trip} />
      </MapContainer>
    </div>
  );
}

function SetupScreen() {
  return (
    <main className="center-page">
      <section className="auth-card">
        <div className="brand-mark"><Bus size={28} /></div>
        <p className="eyebrow">Configuração inicial</p>
        <h1>Conecte o Supabase</h1>
        <p>Adicione estas variáveis no arquivo <code>client/.env.local</code> e também na Vercel:</p>
        <pre>VITE_SUPABASE_URL{`\n`}VITE_SUPABASE_ANON_KEY{`\n`}VITE_FAMILY_TRIP_SLUG=familia-lubian</pre>
        <p className="muted">O passo a passo completo está em <code>docs/VERCEL-SUPABASE.md</code>.</p>
      </section>
    </main>
  );
}

function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function signIn(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const { error: authError } = await supabase!.auth.signInWithPassword({ email, password });
    if (authError) setError(authError.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos.' : authError.message);
    setBusy(false);
  }

  return (
    <main className="center-page auth-background">
      <section className="auth-card">
        <div className="brand-mark"><Bus size={28} /></div>
        <p className="eyebrow">Viagem MS · 2026</p>
        <h1>Família Lubian</h1>
        <p>Acesse o planejamento compartilhado da excursão.</p>
        <form onSubmit={signIn} className="stack-form">
          <label>E-mail<input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" /></label>
          <label>Senha<span className="password-field"><input type={showPassword ? 'text' : 'password'} autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Sua senha" /><button type="button" className="icon-button" onClick={() => setShowPassword((value) => !value)} aria-label="Mostrar senha">{showPassword ? <EyeOff size={19} /> : <Eye size={19} />}</button></span></label>
          {error && <div className="form-error"><AlertTriangle size={17} />{error}</div>}
          <button className="primary-button" disabled={busy}>{busy ? <Loader2 className="spin" size={19} /> : <ShieldCheck size={19} />} Entrar</button>
        </form>
        <p className="security-note"><ShieldCheck size={16} /> Dados pessoais visíveis somente para usuários autorizados.</p>
      </section>
    </main>
  );
}

function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  useEffect(() => {
    const close = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, [onClose]);
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section className="modal-card" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={title}>
        <header><h2>{title}</h2><button className="icon-button" onClick={onClose}><X /></button></header>
        {children}
      </section>
    </div>
  );
}

function EmptyState({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return <div className="empty-state">{icon}<strong>{title}</strong><span>{text}</span></div>;
}

function SummaryScreen({ trip, passengers, tasks, costs, go }: { trip: FamilyTrip; passengers: Passenger[]; tasks: TripTask[]; costs: TripCost[]; go: (screen: Screen) => void }) {
  const confirmed = passengers.filter((p) => p.confirmed).length;
  const completed = tasks.filter((task) => task.completed).length;
  const total = costs.reduce((sum, cost) => sum + Number(cost.amount), 0);
  return (
    <div className="screen-stack">
      <section className="hero-card">
        <div><p className="eyebrow light">Encontro de família</p><h2>Rumo a Tacuru</h2><p>{dateRange(trip)}</p></div>
        <div className="hero-route"><span>Blumenau</span><ArrowRight /><span>Tacuru</span></div>
      </section>
      <div className="stat-grid">
        <button className="stat-card" onClick={() => go('passengers')}><Users /><span><strong>{passengers.length}</strong> passageiros</span><small>{confirmed} confirmados</small></button>
        <button className="stat-card" onClick={() => go('tasks')}><ClipboardCheck /><span><strong>{tasks.length - completed}</strong> pendências</span><small>{completed} concluídas</small></button>
        <button className="stat-card" onClick={() => go('costs')}><CircleDollarSign /><span><strong>{money.format(total)}</strong></span><small>orçamento atual</small></button>
      </div>
      <section className="content-card next-card">
        <div className="section-title"><div><p className="eyebrow">Próximo passo</p><h3>Complete a lista oficial</h3></div><span className="round-icon"><ClipboardCheck /></span></div>
        <p>A transportadora precisa receber nome completo e CPF de cada passageiro antes da viagem.</p>
        <div className="progress"><span style={{ width: `${passengers.length ? (passengers.filter((p) => p.full_name && p.cpf).length / passengers.length) * 100 : 0}%` }} /></div>
        <button className="text-button" onClick={() => go('passengers')}>Preencher passageiros <ChevronRight size={18} /></button>
      </section>
      <section className="content-card route-preview" onClick={() => go('trip')} role="button" tabIndex={0}>
        <div className="section-title"><div><p className="eyebrow">Trajeto</p><h3>Blumenau/SC → Tacuru/MS</h3></div><MapPinned /></div>
        <div className="mini-route"><span /><i /><span /></div>
        <div className="route-labels"><span>{trip.origin.address}</span><span>{trip.destination.address}</span></div>
      </section>
      <section className="content-card info-banner"><Clock3 /><div><strong>Atenção ao fuso horário</strong><p>Tacuru/MS fica 1 hora atrás de Blumenau/SC. Os horários locais estão identificados em cada trecho.</p></div></section>
    </div>
  );
}

const blankPassenger: Omit<Passenger, 'id' | 'trip_id' | 'sort_order'> = { name: '', full_name: '', cpf: '', phone: '', emergency_contact: '', age_group: 'unknown', confirmed: false, seat_no: null, notes: '' };

function PassengerForm({ tripId, passenger, onClose }: { tripId: string; passenger?: Passenger; onClose: () => void }) {
  const [form, setForm] = useState(passenger || { ...blankPassenger, trip_id: tripId, id: 0, sort_order: 999 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function save(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    const payload = { name: form.name.trim(), full_name: form.full_name.trim(), cpf: form.cpf.replace(/\D/g, ''), phone: form.phone.trim(), emergency_contact: form.emergency_contact.trim(), age_group: form.age_group, confirmed: form.confirmed, seat_no: form.seat_no || null, notes: form.notes.trim() };
    const result = passenger
      ? await supabase!.from('family_passengers').update(payload).eq('id', passenger.id)
      : await supabase!.from('family_passengers').insert({ ...payload, trip_id: tripId, sort_order: 999 });
    if (result.error) setError(result.error.message); else onClose();
    setBusy(false);
  }
  async function remove() {
    if (!passenger || !window.confirm(`Remover ${passenger.name} da lista?`)) return;
    setBusy(true); const { error: removeError } = await supabase!.from('family_passengers').delete().eq('id', passenger.id);
    if (removeError) setError(removeError.message); else onClose(); setBusy(false);
  }
  const set = (key: keyof Passenger, value: unknown) => setForm((old) => ({ ...old, [key]: value }));
  return <form onSubmit={save} className="stack-form modal-form">
    <div className="field-row"><label>Nome curto<input required value={form.name} onChange={(e) => set('name', e.target.value)} /></label><label>Adulto ou criança<select value={form.age_group} onChange={(e) => set('age_group', e.target.value)}><option value="unknown">A definir</option><option value="adult">Adulto</option><option value="child">Criança</option></select></label></div>
    <label>Nome completo<input value={form.full_name} onChange={(e) => set('full_name', e.target.value)} placeholder="Como consta no documento" /></label>
    <div className="field-row"><label>CPF<input inputMode="numeric" value={form.cpf} onChange={(e) => set('cpf', e.target.value)} placeholder="Somente números" maxLength={14} /></label><label>Assento<input type="number" min="1" max="46" value={form.seat_no || ''} onChange={(e) => set('seat_no', e.target.value ? Number(e.target.value) : null)} /></label></div>
    <label>Telefone<input type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} /></label>
    <label>Contato de emergência<input value={form.emergency_contact} onChange={(e) => set('emergency_contact', e.target.value)} /></label>
    <label>Observações<textarea rows={3} value={form.notes} onChange={(e) => set('notes', e.target.value)} /></label>
    <label className="check-label"><input type="checkbox" checked={form.confirmed} onChange={(e) => set('confirmed', e.target.checked)} /> Presença confirmada</label>
    {error && <div className="form-error"><AlertTriangle size={17} />{error}</div>}
    <div className="form-actions">{passenger && <button type="button" className="danger-button" onClick={remove} disabled={busy}><Trash2 size={18} /> Remover</button>}<button className="primary-button" disabled={busy}>{busy ? <Loader2 className="spin" size={18} /> : <Check size={18} />} Salvar</button></div>
  </form>;
}

function PassengersScreen({ trip, passengers }: { trip: FamilyTrip; passengers: Passenger[] }) {
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Passenger | 'new' | null>(null);
  const filtered = passengers.filter((p) => `${p.name} ${p.full_name}`.toLowerCase().includes(search.toLowerCase()));
  async function toggle(passenger: Passenger) { await supabase!.from('family_passengers').update({ confirmed: !passenger.confirmed }).eq('id', passenger.id); }
  return <div className="screen-stack">
    <section className="screen-heading"><div><p className="eyebrow">Lista da excursão</p><h2>Passageiros</h2><p>{passengers.length} nomes · {passengers.filter((p) => p.confirmed).length} confirmados</p></div><button className="primary-button compact" onClick={() => setEditing('new')}><Plus size={18} /> Adicionar</button></section>
    <div className="search-box"><Search size={19} /><input aria-label="Buscar passageiro" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome..." /></div>
    <section className="content-card privacy-banner"><AlertTriangle /><div><strong>Link compartilhado</strong><p>Como esta versão não usa login, evite preencher CPF e telefone se o endereço da página for divulgado fora da família.</p></div></section>
    <section className="list-card">
      {filtered.map((passenger, index) => <article className="person-row" key={passenger.id}>
        <button className={`confirm-button ${passenger.confirmed ? 'done' : ''}`} onClick={() => toggle(passenger)} aria-label="Confirmar presença">{passenger.confirmed ? <Check size={16} /> : index + 1}</button>
        <button className="row-main" onClick={() => setEditing(passenger)}><strong>{passenger.full_name || passenger.name}</strong><span>{passenger.age_group === 'child' ? 'Criança' : passenger.age_group === 'adult' ? 'Adulto' : 'Idade a definir'}{passenger.seat_no ? ` · Assento ${passenger.seat_no}` : ''}{passenger.cpf ? ` · CPF ${cpfMask(passenger.cpf)}` : ' · CPF pendente'}</span></button>
        <button className="icon-button" onClick={() => setEditing(passenger)}><Pencil size={18} /></button>
      </article>)}
      {!filtered.length && <EmptyState icon={<Users />} title="Nenhum passageiro" text="Tente outro nome ou adicione uma pessoa." />}
    </section>
    {editing && <Modal title={editing === 'new' ? 'Adicionar passageiro' : `Dados de ${editing.name}`} onClose={() => setEditing(null)}><PassengerForm tripId={trip.id} passenger={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} /></Modal>}
  </div>;
}

type TaskDraft = { title: string; description: string; priority: 'high' | 'normal' | 'low'; due_date: string };
const blankTask: TaskDraft = { title: '', description: '', priority: 'normal', due_date: '' };
function TaskForm({ tripId, task, onClose }: { tripId: string; task?: TripTask; onClose: () => void }) {
  const [form, setForm] = useState<TaskDraft>(task ? { title: task.title, description: task.description, priority: task.priority, due_date: task.due_date || '' } : blankTask);
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  async function save(event: FormEvent) { event.preventDefault(); setBusy(true); const payload = { title: form.title.trim(), description: form.description.trim(), priority: form.priority, due_date: form.due_date || null }; const result = task ? await supabase!.from('family_tasks').update(payload).eq('id', task.id) : await supabase!.from('family_tasks').insert({ ...payload, trip_id: tripId, completed: false, sort_order: 999 }); if (result.error) setError(result.error.message); else onClose(); setBusy(false); }
  async function remove() { if (!task || !confirm('Remover esta pendência?')) return; setBusy(true); const { error: e } = await supabase!.from('family_tasks').delete().eq('id', task.id); if (e) setError(e.message); else onClose(); setBusy(false); }
  return <form className="stack-form modal-form" onSubmit={save}><label>Título<input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label><label>Detalhes<textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label><div className="field-row"><label>Prioridade<select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as 'high' | 'normal' | 'low' })}><option value="high">Alta</option><option value="normal">Normal</option><option value="low">Baixa</option></select></label><label>Prazo<input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></label></div>{error && <div className="form-error">{error}</div>}<div className="form-actions">{task && <button type="button" className="danger-button" onClick={remove}><Trash2 size={18} /> Remover</button>}<button className="primary-button" disabled={busy}><Check size={18} /> Salvar</button></div></form>;
}

function TasksScreen({ trip, tasks }: { trip: FamilyTrip; tasks: TripTask[] }) {
  const [editing, setEditing] = useState<TripTask | 'new' | null>(null);
  async function toggle(task: TripTask) { await supabase!.from('family_tasks').update({ completed: !task.completed }).eq('id', task.id); }
  return <div className="screen-stack"><section className="screen-heading"><div><p className="eyebrow">Organização</p><h2>Pendências</h2><p>{tasks.filter((task) => task.completed).length} de {tasks.length} concluídas</p></div><button className="primary-button compact" onClick={() => setEditing('new')}><Plus size={18} /> Nova</button></section><section className="list-card">{tasks.map((task) => <article className={`task-row ${task.completed ? 'completed' : ''}`} key={task.id}><button className={`task-check ${task.completed ? 'done' : ''}`} onClick={() => toggle(task)}>{task.completed && <Check size={17} />}</button><button className="row-main" onClick={() => setEditing(task)}><strong>{task.title}</strong><span>{task.description || (task.due_date ? `Prazo: ${formatDate(task.due_date)}` : 'Sem detalhes')}</span></button><span className={`priority ${task.priority}`}>{task.priority === 'high' ? 'Alta' : task.priority === 'low' ? 'Baixa' : 'Normal'}</span></article>)}</section>{editing && <Modal title={editing === 'new' ? 'Nova pendência' : 'Editar pendência'} onClose={() => setEditing(null)}><TaskForm tripId={trip.id} task={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} /></Modal>}</div>;
}

function CostForm({ tripId, cost, onClose }: { tripId: string; cost?: TripCost; onClose: () => void }) {
  const [form, setForm] = useState<{ name: string; amount: number; status: 'planned' | 'paid'; due_date: string; notes: string }>(cost ? { name: cost.name, amount: Number(cost.amount), status: cost.status, due_date: cost.due_date || '', notes: cost.notes } : { name: '', amount: 0, status: 'planned', due_date: '', notes: '' }); const [error, setError] = useState('');
  async function save(event: FormEvent) { event.preventDefault(); const payload = { name: form.name.trim(), amount: Number(form.amount), status: form.status, due_date: form.due_date || null, notes: form.notes.trim() }; const result = cost ? await supabase!.from('family_costs').update(payload).eq('id', cost.id) : await supabase!.from('family_costs').insert({ ...payload, trip_id: tripId }); if (result.error) setError(result.error.message); else onClose(); }
  async function remove() { if (!cost || !confirm('Remover este custo?')) return; const { error: e } = await supabase!.from('family_costs').delete().eq('id', cost.id); if (e) setError(e.message); else onClose(); }
  return <form className="stack-form modal-form" onSubmit={save}><label>Descrição<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label><div className="field-row"><label>Valor (R$)<input required type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} /></label><label>Situação<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as 'planned' | 'paid' })}><option value="planned">Previsto</option><option value="paid">Pago</option></select></label></div><label>Vencimento<input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></label><label>Observações<textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label>{error && <div className="form-error">{error}</div>}<div className="form-actions">{cost && <button type="button" className="danger-button" onClick={remove}><Trash2 size={18} /> Remover</button>}<button className="primary-button"><Check size={18} /> Salvar</button></div></form>;
}

function CostsScreen({ trip, costs }: { trip: FamilyTrip; costs: TripCost[] }) {
  const [editing, setEditing] = useState<TripCost | 'new' | null>(null); const total = costs.reduce((sum, item) => sum + Number(item.amount), 0); const paid = costs.filter((c) => c.status === 'paid').reduce((sum, item) => sum + Number(item.amount), 0);
  return <div className="screen-stack"><section className="screen-heading"><div><p className="eyebrow">Controle financeiro</p><h2>Custos</h2><p>Orçamento compartilhado</p></div><button className="primary-button compact" onClick={() => setEditing('new')}><Plus size={18} /> Custo</button></section><section className="finance-hero"><p>Total previsto</p><strong>{money.format(total)}</strong><div><span>Pago {money.format(paid)}</span><span>Falta {money.format(total - paid)}</span></div></section><section className="list-card">{costs.map((cost) => <button className="cost-row" key={cost.id} onClick={() => setEditing(cost)}><span className={`cost-icon ${cost.status}`}><CircleDollarSign /></span><span className="row-main"><strong>{cost.name}</strong><span>{cost.due_date ? `Vence em ${formatDate(cost.due_date)}` : 'Sem vencimento'} · {cost.status === 'paid' ? 'Pago' : 'Previsto'}</span></span><strong>{money.format(Number(cost.amount))}</strong><ChevronRight size={18} /></button>)}{!costs.length && <EmptyState icon={<CircleDollarSign />} title="Nenhum custo" text="Adicione o primeiro item do orçamento." />}</section>{editing && <Modal title={editing === 'new' ? 'Adicionar custo' : 'Editar custo'} onClose={() => setEditing(null)}><CostForm tripId={trip.id} cost={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} /></Modal>}</div>;
}

function TransportForm({ trip, onClose }: { trip: FamilyTrip; onClose: () => void }) {
  const [transport, setTransport] = useState<Transport>(trip.transport); const [error, setError] = useState(''); const set = (key: keyof Transport, value: unknown) => setTransport((old) => ({ ...old, [key]: value }));
  async function save(event: FormEvent) { event.preventDefault(); const { error: e } = await supabase!.from('family_trips').update({ transport }).eq('id', trip.id); if (e) setError(e.message); else onClose(); }
  return <form className="stack-form modal-form" onSubmit={save}><label>Transportadora<input value={transport.company} onChange={(e) => set('company', e.target.value)} /></label><label>Veículo<input value={transport.vehicle} onChange={(e) => set('vehicle', e.target.value)} /></label><div className="field-row"><label>Capacidade<input type="number" value={transport.capacity} onChange={(e) => set('capacity', Number(e.target.value))} /></label><label>Prazo do pagamento<input type="date" value={transport.payment_deadline} onChange={(e) => set('payment_deadline', e.target.value)} /></label></div><div className="field-row"><label>Saída (horário de SC)<input type="time" value={transport.departure_time || ''} onChange={(e) => set('departure_time', e.target.value || null)} /></label><label>Retorno (horário de MS)<input type="time" value={transport.return_time || ''} onChange={(e) => set('return_time', e.target.value || null)} /></label></div><label>Formas de pagamento<input value={transport.payment_methods} onChange={(e) => set('payment_methods', e.target.value)} /></label><label>Observações<textarea rows={5} value={transport.notes} onChange={(e) => set('notes', e.target.value)} /></label>{error && <div className="form-error">{error}</div>}<div className="form-actions"><button className="primary-button"><Check size={18} /> Salvar alterações</button></div></form>;
}

function TripScreen({ trip }: { trip: FamilyTrip }) {
  const [editing, setEditing] = useState(false);
  return <div className="screen-stack"><section className="screen-heading"><div><p className="eyebrow">Rota e transporte</p><h2>Detalhes da viagem</h2><p>{dateRange(trip)}</p></div><button className="secondary-button compact" onClick={() => setEditing(true)}><Pencil size={17} /> Editar</button></section><RouteMap trip={trip} /><a className="primary-button full-button" href={mapsUrl(trip)} target="_blank" rel="noreferrer"><ExternalLink size={18} /> Abrir rota no Google Maps</a><section className="content-card timeline"><div className="timeline-item"><span className="timeline-dot origin" /><div><p className="eyebrow">Saída · horário de SC</p><h3>{trip.origin.name}</h3><p>{trip.origin.address}</p><strong>{formatDate(trip.start_date)} · {trip.transport.departure_time || 'horário a definir'}</strong><small>Fuso: {SC_TIME_ZONE}</small></div></div><div className="timeline-line" /><div className="timeline-item"><span className="timeline-dot destination" /><div><p className="eyebrow">Destino · horário de MS</p><h3>{trip.destination.name}</h3><p>{trip.destination.address}</p><strong>Chegada a definir</strong><small>Fuso: {MS_TIME_ZONE} · 1 hora atrás de SC</small></div></div></section><section className="content-card bus-card"><div className="section-title"><div><p className="eyebrow">Transporte</p><h3>{trip.transport.company}</h3></div><Bus /></div><dl><div><dt>Veículo</dt><dd>{trip.transport.vehicle}</dd></div><div><dt>Capacidade</dt><dd>{trip.transport.capacity} lugares</dd></div><div><dt>Pagamento até</dt><dd>{formatDate(trip.transport.payment_deadline)}</dd></div><div><dt>Forma</dt><dd>{trip.transport.payment_methods}</dd></div></dl><p>{trip.transport.notes}</p></section>{editing && <Modal title="Editar ônibus e horários" onClose={() => setEditing(false)}><TransportForm trip={trip} onClose={() => setEditing(false)} /></Modal>}</div>;
}

const nav: { id: Screen; label: string; icon: ReactNode }[] = [
  { id: 'summary', label: 'Início', icon: <Bus /> }, { id: 'passengers', label: 'Pessoas', icon: <Users /> }, { id: 'tasks', label: 'Tarefas', icon: <ClipboardCheck /> }, { id: 'costs', label: 'Custos', icon: <CircleDollarSign /> }, { id: 'trip', label: 'Viagem', icon: <MapPinned /> },
];

export function FamiliaApp() {
  const [screen, setScreen] = useState<Screen>('summary'); const [menuOpen, setMenuOpen] = useState(false); const [trip, setTrip] = useState<FamilyTrip | null>(null); const [passengers, setPassengers] = useState<Passenger[]>([]); const [tasks, setTasks] = useState<TripTask[]>([]); const [costs, setCosts] = useState<TripCost[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    if (!supabase) return; setError('');
    const { data: tripData, error: tripError } = await supabase.from('family_trips').select('*').eq('slug', familyTripSlug).single();
    if (tripError) { setError(tripError.code === 'PGRST116' ? 'Viagem não encontrada. Execute o arquivo supabase/schema-and-seed.sql no Supabase.' : tripError.message); setLoading(false); return; }
    const [passengerResult, taskResult, costResult] = await Promise.all([
      supabase.from('family_passengers').select('*').eq('trip_id', tripData.id).order('sort_order').order('id'),
      supabase.from('family_tasks').select('*').eq('trip_id', tripData.id).order('completed').order('sort_order'),
      supabase.from('family_costs').select('*').eq('trip_id', tripData.id).order('id'),
    ]);
    const firstError = passengerResult.error || taskResult.error || costResult.error;
    if (firstError) setError(firstError.message); else { setTrip(tripData as FamilyTrip); setPassengers((passengerResult.data || []) as Passenger[]); setTasks((taskResult.data || []) as TripTask[]); setCosts((costResult.data || []) as TripCost[]); }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!supabase) return; loadData();
    const channel = supabase.channel('familia-lubian-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'family_trips' }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'family_passengers' }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'family_tasks' }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'family_costs' }, loadData)
      .subscribe();
    return () => { supabase!.removeChannel(channel); };
  }, [loadData]);

  const screenTitle = useMemo(() => nav.find((item) => item.id === screen)?.label || 'Início', [screen]);
  if (!isSupabaseConfigured) return <SetupScreen />;
  if (loading) return <main className="loading-page"><Loader2 className="spin" /><span>Carregando planejamento…</span></main>;
  if (error || !trip) return <main className="center-page"><section className="auth-card"><AlertTriangle className="error-icon" /><h1>Não foi possível abrir</h1><p>{error}</p><button className="primary-button" onClick={loadData}>Tentar novamente</button></section></main>;

  return <div className="app-shell">
    <aside className={`sidebar ${menuOpen ? 'open' : ''}`}><div className="sidebar-brand"><span className="brand-mark small"><Bus /></span><div><strong>Família Lubian</strong><small>Viagem MS · 2026</small></div></div><nav>{nav.map((item) => <button key={item.id} className={screen === item.id ? 'active' : ''} onClick={() => { setScreen(item.id); setMenuOpen(false); }}>{item.icon}<span>{item.label}</span></button>)}</nav></aside>
    {menuOpen && <button className="sidebar-scrim" onClick={() => setMenuOpen(false)} aria-label="Fechar menu" />}
    <main className="app-main"><header className="topbar"><button className="mobile-menu icon-button" onClick={() => setMenuOpen(true)}><Menu /></button><div><small>EXCURSÃO FAMÍLIA LUBIAN</small><strong>{screenTitle}</strong></div><span className="sync-status"><span /> Sincronizado</span></header><div className="content-area">{screen === 'summary' && <SummaryScreen trip={trip} passengers={passengers} tasks={tasks} costs={costs} go={setScreen} />}{screen === 'passengers' && <PassengersScreen trip={trip} passengers={passengers} />}{screen === 'tasks' && <TasksScreen trip={trip} tasks={tasks} />}{screen === 'costs' && <CostsScreen trip={trip} costs={costs} />}{screen === 'trip' && <TripScreen trip={trip} />}</div></main>
    <nav className="bottom-nav">{nav.map((item) => <button key={item.id} className={screen === item.id ? 'active' : ''} onClick={() => setScreen(item.id)}>{item.icon}<span>{item.label}</span></button>)}</nav>
  </div>;
}
