import { useState } from 'react'
import {
  AlertCircle, Bus, CalendarDays, CheckCircle2, HelpCircle, ListChecks,
  Map as MapIcon, MapPin, Route, Users, Wallet,
} from 'lucide-react'
import { useTranslation } from '../../../i18n'
import MSheet from '../../components/MSheet'
import type { MTripShellApi, TripPlanner } from './MTripShell'

interface MSimpleTripOverviewProps {
  planner: TripPlanner
  shell: MTripShellApi
}

function dateRange(start: string | null | undefined, end: string | null | undefined, locale: string): string {
  if (!start && !end) return '—'
  const format = (value: string | null | undefined) => {
    if (!value) return '—'
    const date = new Date(`${value.slice(0, 10)}T12:00:00`)
    return Number.isNaN(date.getTime())
      ? value
      : new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short', year: 'numeric' }).format(date)
  }
  return `${format(start)} — ${format(end)}`
}

export default function MSimpleTripOverview({ planner, shell }: MSimpleTripOverviewProps) {
  const { locale } = useTranslation()
  const { t, trip, tripId, days, places, tripMembers, reservations, budgetItems, todoItems } = planner
  const guideKey = `trek-simple-guide:${tripId}:v1`
  const [guideOpen, setGuideOpen] = useState(() => {
    try { return localStorage.getItem(guideKey) !== 'done' } catch { return false }
  })

  if (!trip) return null

  const passengers = tripMembers.filter(member => Boolean(member.is_guest)).length
  const organizers = Math.max(0, tripMembers.length - passengers)
  const openTasks = todoItems.filter(item => !item.checked).length
  const pendingTransports = reservations.filter(item => item.status !== 'confirmed' && item.status !== 'cancelled').length
  const missingTimes = reservations.filter(item => !item.reservation_time).length
  const unassignedCosts = budgetItems.filter(item => !item.payers?.length).length
  const origin = places.find(place => /blumenau/i.test(`${place.name} ${place.address || ''}`)) ?? places[0]
  const destination = places.find(place => /tacuru/i.test(`${place.name} ${place.address || ''}`))
    ?? places.find(place => place.id !== origin?.id)
    ?? places[places.length - 1]

  const closeGuide = () => {
    try { localStorage.setItem(guideKey, 'done') } catch { /* private storage can be unavailable */ }
    setGuideOpen(false)
  }

  const peopleLabel = organizers === 1
    ? t('mobileTrip.summary.peopleOneOrganizer', { passengers })
    : t('mobileTrip.summary.peopleManyOrganizers', { passengers, organizers })

  const actions = [
    { key: 'route', label: t('mobileTrip.summary.actionRoute'), sub: t('mobileTrip.summary.actionRouteSub'), icon: Route, onClick: () => shell.setTravelMode('edit') },
    { key: 'map', label: t('mobileTrip.summary.actionMap'), sub: t('mobileTrip.summary.actionMapSub'), icon: MapIcon, onClick: shell.toggleView },
    { key: 'people', label: t('mobileTrip.summary.actionPeople'), sub: peopleLabel, icon: Users, onClick: () => shell.openSheet('members') },
    { key: 'costs', label: t('mobileTrip.summary.actionCosts'), sub: unassignedCosts ? t('mobileTrip.summary.costsPending', { count: unassignedCosts }) : t('mobileTrip.summary.ready'), icon: Wallet, onClick: () => shell.setTrTab('finanzplan') },
    { key: 'tasks', label: t('mobileTrip.summary.actionTasks'), sub: openTasks ? t('mobileTrip.summary.tasksOpen', { count: openTasks }) : t('mobileTrip.summary.ready'), icon: ListChecks, onClick: () => { shell.setListsTab('todo'); shell.setTrTab('listen') } },
    { key: 'bus', label: t('mobileTrip.summary.actionBus'), sub: pendingTransports ? t('mobileTrip.summary.transportPending') : t('mobileTrip.summary.ready'), icon: Bus, onClick: () => shell.setTrTab('transports') },
  ]

  return (
    <>
      <main className="absolute inset-x-0 bottom-[calc(var(--bottom-nav-h,84px)+8px)] top-[calc(var(--m-safe-top,12px)+52px)] overflow-y-auto px-4 pb-5">
        <section className="rounded-[24px] bg-[#15151A] p-5 text-white shadow-[0_22px_48px_-22px_rgba(0,0,0,.55)]">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <div className="font-geist text-[0.625rem] font-bold uppercase tracking-[.11em] text-white/55">{t('mobileTrip.summary.eyebrow')}</div>
              <h1 className="mt-1 text-[1.45rem] font-extrabold leading-tight">{trip.title}</h1>
              <div className="mt-2 flex items-center gap-2 font-geist text-[0.72rem] font-semibold text-white/75">
                <CalendarDays size={14} aria-hidden="true" />
                {dateRange(trip.start_date, trip.end_date, locale)}
              </div>
            </div>
            <button type="button" onClick={() => setGuideOpen(true)} className="flex h-10 flex-none items-center gap-1.5 rounded-full bg-white/12 px-3 text-[0.68rem] font-bold text-white" aria-label={t('mobileTrip.summary.howToUse')}>
              <HelpCircle size={15} />
              {t('mobileTrip.summary.help')}
            </button>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <HeroStat value={String(passengers)} label={t('mobileTrip.summary.passengers')} />
            <HeroStat value={String(days.length)} label={t('mobileTrip.summary.days')} />
            <HeroStat value={String(openTasks)} label={t('mobileTrip.summary.pending')} />
          </div>
        </section>

        <section className="mt-3 rounded-[20px] border border-[color:var(--m-cbr)] bg-m-card p-4">
          <div className="flex items-center gap-2">
            <MapPin size={16} className="text-m-muted" />
            <h2 className="text-[0.9rem] font-extrabold text-m-ink">{t('mobileTrip.summary.route')}</h2>
          </div>
          <RouteStop label={t('mobileTrip.summary.departure')} name={origin?.name} address={origin?.address} />
          <div className="ml-[5px] h-4 border-l-2 border-dashed border-[color:var(--m-rowbr)]" />
          <RouteStop label={t('mobileTrip.summary.destination')} name={destination?.name} address={destination?.address} />
        </section>

        <section className="mt-3 grid grid-cols-2 gap-2" aria-label={t('mobileTrip.summary.shortcuts')}>
          {actions.map(({ key, label, sub, icon: Icon, onClick }) => (
            <button key={key} type="button" onClick={onClick} className="min-h-[92px] rounded-[19px] border border-[color:var(--m-cbr)] bg-m-card p-3 text-left shadow-[0_12px_28px_-24px_rgba(0,0,0,.45)]">
              <span className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-[color:var(--m-ic)] text-m-ink"><Icon size={18} strokeWidth={2.1} /></span>
              <span className="mt-2 block text-[0.8rem] font-extrabold text-m-ink">{label}</span>
              <span className="mt-0.5 block text-[0.61rem] leading-snug text-m-faint">{sub}</span>
            </button>
          ))}
        </section>

        {(pendingTransports > 0 || missingTimes > 0 || unassignedCosts > 0 || openTasks > 0) && (
          <section className="mt-3 rounded-[20px] border border-[color:var(--m-rowbr)] bg-m-card p-4">
            <div className="flex items-center gap-2 text-[0.85rem] font-extrabold text-m-ink"><AlertCircle size={16} className="text-[color:var(--m-st-pending)]" />{t('mobileTrip.summary.beforeTravel')}</div>
            <div className="mt-3 space-y-2">
              {pendingTransports > 0 && <PendingRow text={t('mobileTrip.summary.confirmTransport')} />}
              {missingTimes > 0 && <PendingRow text={t('mobileTrip.summary.setTimes')} />}
              {unassignedCosts > 0 && <PendingRow text={t('mobileTrip.summary.assignCosts')} />}
              {openTasks > 0 && <PendingRow text={t('mobileTrip.summary.finishTasks', { count: openTasks })} />}
            </div>
          </section>
        )}
      </main>

      <MSheet open={guideOpen} onClose={closeGuide} variant="card" material="opaque" ariaLabel={t('mobileTrip.summary.howToUse')} className="p-5">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-m-act text-m-actfg"><CheckCircle2 size={24} /></div>
        <h2 className="mt-3 text-center text-[1.15rem] font-extrabold text-m-ink">{t('mobileTrip.summary.guideTitle')}</h2>
        <p className="mx-auto mt-1 max-w-[290px] text-center text-[0.72rem] leading-relaxed text-m-muted">{t('mobileTrip.summary.guideIntro')}</p>
        <ol className="mt-4 space-y-3">
          <GuideStep number="1" title={t('mobileTrip.summary.guideStep1')} body={t('mobileTrip.summary.guideStep1Body')} />
          <GuideStep number="2" title={t('mobileTrip.summary.guideStep2')} body={t('mobileTrip.summary.guideStep2Body')} />
          <GuideStep number="3" title={t('mobileTrip.summary.guideStep3')} body={t('mobileTrip.summary.guideStep3Body')} />
        </ol>
        <div className="mt-4 rounded-xl bg-[color:var(--m-ic)] px-3 py-2 text-[0.65rem] leading-relaxed text-m-muted">{t('mobileTrip.summary.guidePrivacy')}</div>
        <button type="button" onClick={closeGuide} className="mt-4 h-11 w-full rounded-full bg-m-act text-[0.8rem] font-bold text-m-actfg">{t('mobileTrip.summary.guideDone')}</button>
      </MSheet>
    </>
  )
}

function HeroStat({ value, label }: { value: string; label: string }) {
  return <div className="rounded-xl bg-white/10 px-2 py-2 text-center"><div className="font-geist text-[1rem] font-extrabold tabular-nums">{value}</div><div className="mt-0.5 text-[0.54rem] font-bold uppercase tracking-[.06em] text-white/60">{label}</div></div>
}

function RouteStop({ label, name, address }: { label: string; name?: string; address?: string | null }) {
  return <div className="mt-3 flex gap-3"><span className="mt-1 h-3 w-3 flex-none rounded-full border-[3px] border-m-card bg-m-act ring-1 ring-[color:var(--m-rowbr)]" /><div className="min-w-0"><div className="font-geist text-[0.54rem] font-bold uppercase tracking-[.08em] text-m-faint">{label}</div><div className="mt-0.5 text-[0.78rem] font-bold text-m-ink">{name || '—'}</div>{address && <div className="mt-0.5 text-[0.61rem] leading-snug text-m-muted">{address}</div>}</div></div>
}

function PendingRow({ text }: { text: string }) {
  return <div className="flex items-start gap-2 text-[0.69rem] leading-relaxed text-m-muted"><span className="mt-[5px] h-1.5 w-1.5 flex-none rounded-full bg-[color:var(--m-st-pending)]" />{text}</div>
}

function GuideStep({ number, title, body }: { number: string; title: string; body: string }) {
  return <li className="flex gap-3"><span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-m-act font-geist text-[0.68rem] font-extrabold text-m-actfg">{number}</span><div><div className="text-[0.76rem] font-extrabold text-m-ink">{title}</div><div className="mt-0.5 text-[0.65rem] leading-relaxed text-m-muted">{body}</div></div></li>
}
