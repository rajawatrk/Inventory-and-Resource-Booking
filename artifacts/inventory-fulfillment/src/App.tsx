import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { Route, Switch, Link, useLocation, Router as WouterRouter } from 'wouter';
import {
  Activity, AlertTriangle, ArrowDownLeft, ArrowLeftRight, ArrowRight, ArrowUpRight,
  Boxes, CalendarDays, Check, CheckCircle2, ChevronDown, CircleHelp, Clock3, MapPin,
  Menu, Package, Plus, RotateCw, Search, ShieldCheck, SlidersHorizontal, Sparkles,
  Warehouse, X,
} from 'lucide-react';
import {
  getGetDashboardQueryKey, getListInventoryQueryKey, getListLocationsQueryKey,
  getListMovementsQueryKey, getListReservationsQueryKey, getListResourcesQueryKey,
  useAdjustInventory, useCancelReservation, useCreateLocation, useCreateReservation,
  useCreateResource, useFulfillReservation, useGetDashboard, useHealthCheck,
  useListInventory, useListLocations, useListMovements, useListReservations,
  useListResources,
} from '@workspace/api-client-react';
import type {
  InventoryAdjustmentInput, InventoryLevel, Location, Reservation, ReservationInput,
  Resource, ResourceInput, StockMovement,
} from '@workspace/api-client-react';

const client = new QueryClient({ defaultOptions: { queries: { staleTime: 20_000, retry: 1 } } });
const navItems = [
  { href: '/', label: 'Overview', icon: Boxes },
  { href: '/inventory', label: 'Inventory', icon: Warehouse },
  { href: '/resources', label: 'Resources', icon: Package },
  { href: '/reservations', label: 'Reservations', icon: CalendarDays },
  { href: '/activity', label: 'Activity', icon: Activity },
];
const dateTime = (value?: string) => value ? new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(value)) : '—';
const dayDate = (value?: string) => value ? new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value)) : '—';
const titleCase = (text: string) => text.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

function App() {
  return <QueryClientProvider client={client}><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Shell /></WouterRouter></QueryClientProvider>;
}

function Shell() {
  const [path] = useLocation();
  const [mobileMenu, setMobileMenu] = useState(false);
  const pageTitle = navItems.find((item) => item.href === path)?.label ?? 'Not found';
  const health = useHealthCheck();
  return <div className="app-shell flex">
    <aside className="hidden w-[248px] shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex">
      <div className="px-6 pb-8 pt-7">
        <Link href="/" className="flex items-center gap-3" data-testid="link-brand">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground"><Warehouse size={21}/></span>
          <span><span className="block font-[var(--app-font-serif)] text-[17px] font-extrabold tracking-[-.04em]">Goodstock</span><span className="mt-0.5 block text-[10px] uppercase tracking-[.22em] text-sidebar-foreground/55">Field operations</span></span>
        </Link>
      </div>
      <div className="px-4">
        <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[.19em] text-sidebar-foreground/40">Workspace</p>
        <nav className="space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => <Link key={href} href={href} data-testid={`link-nav-${label.toLowerCase()}`} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-colors ${path === href ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground/65 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground'}`}>
            <Icon size={17} strokeWidth={1.8}/>{label}{href === '/reservations' ? <span className="ml-auto h-1.5 w-1.5 rounded-full bg-sidebar-primary"/> : null}
          </Link>)}
        </nav>
      </div>
      <div className="mt-auto p-4">
        <div className="rounded-2xl border border-sidebar-border bg-sidebar-accent/60 p-4">
          <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold"><ShieldCheck size={15} className="text-sidebar-primary"/> A good day starts here</div>
          <p className="text-xs leading-relaxed text-sidebar-foreground/55">Know what’s on hand, where it lives, and who needs it next.</p>
          <Link href="/inventory" className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-sidebar-primary" data-testid="link-check-stock">Check stock <ArrowRight size={13}/></Link>
        </div>
        <div className="mt-4 flex items-center gap-2 px-2 text-[10px] text-sidebar-foreground/45"><span className={`h-1.5 w-1.5 rounded-full ${health.isError ? 'bg-rose-400' : 'bg-emerald-300'}`}/>{health.isError ? 'Connection needs attention' : 'All systems operational'}</div>
      </div>
    </aside>
    <div className="min-w-0 flex-1">
      <header className="sticky top-0 z-30 border-b border-border/80 bg-background/90 backdrop-blur-md">
        <div className="flex h-[68px] items-center justify-between px-4 sm:px-7 lg:px-10">
          <div className="flex items-center gap-3">
            <button aria-label="Open navigation" onClick={() => setMobileMenu(!mobileMenu)} className="grid h-9 w-9 place-items-center rounded-lg border border-border md:hidden" data-testid="button-mobile-menu"><Menu size={18}/></button>
            <span className="hidden text-xs text-muted-foreground sm:inline">Goodstock</span><span className="hidden text-muted-foreground/50 sm:inline">/</span><span className="text-sm font-semibold">{pageTitle}</span>
          </div>
          <div className="flex items-center gap-3"><span className="hidden items-center gap-2 rounded-full bg-card px-3 py-1.5 text-[11px] text-muted-foreground sm:flex"><span className="h-1.5 w-1.5 rounded-full bg-emerald-600"/>Live workspace</span><span className="grid h-8 w-8 place-items-center rounded-full bg-accent text-[11px] font-bold text-accent-foreground">GT</span></div>
        </div>
        {mobileMenu && <nav className="grid grid-cols-2 gap-2 border-t border-border px-4 py-3 md:hidden">{navItems.map(({ href, label, icon: Icon }) => <Link key={href} onClick={() => setMobileMenu(false)} href={href} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold ${path === href ? 'bg-primary text-primary-foreground' : 'bg-card'}`} data-testid={`mobile-nav-${label.toLowerCase()}`}><Icon size={15}/>{label}</Link>)}</nav>}
      </header>
      <main className="mx-auto max-w-[1480px] px-4 py-7 sm:px-7 sm:py-9 lg:px-10 page-enter">
        <Switch>
          <Route path="/" component={DashboardPage}/>
          <Route path="/inventory" component={InventoryPage}/>
          <Route path="/resources" component={ResourcesPage}/>
          <Route path="/reservations" component={ReservationsPage}/>
          <Route path="/activity" component={ActivityPage}/>
          <Route><NotFound/></Route>
        </Switch>
      </main>
    </div>
    <div className="noise-layer"/>
  </div>;
}

function PageIntro({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="mb-2 text-[10px] font-bold uppercase tracking-[.2em] text-primary">{eyebrow}</p><h1 className="font-[var(--app-font-serif)] text-[32px] font-extrabold tracking-[-.055em] sm:text-[40px]">{title}</h1><p className="mt-2 max-w-[620px] text-sm leading-relaxed text-muted-foreground">{description}</p></div>{action}</div>;
}
function Button({ children, onClick, secondary = false, disabled = false, type = 'button', testId }: { children: ReactNode; onClick?: () => void; secondary?: boolean; disabled?: boolean; type?: 'button' | 'submit'; testId: string }) {
  return <button type={type} onClick={onClick} disabled={disabled} data-testid={testId} className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 text-[13px] font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${secondary ? 'btn-secondary' : 'btn-primary'}`}>{children}</button>;
}
function Panel({ children, className = '' }: { children: ReactNode; className?: string }) { return <section className={`rounded-2xl border border-card-border bg-card shadow-[0_4px_18px_rgba(38,53,48,.025)] ${className}`}>{children}</section>; }
function QueryState({ loading, error, onRetry, children, empty, hasData }: { loading: boolean; error: boolean; onRetry: () => void; children: ReactNode; empty?: ReactNode; hasData?: boolean }) {
  if (loading) return <div className="space-y-3" aria-label="Loading"><div className="h-24 animate-pulse rounded-2xl bg-muted"/><div className="h-48 animate-pulse rounded-2xl bg-muted"/></div>;
  if (error) return <Panel className="p-8 text-center"><AlertTriangle className="mx-auto mb-3 text-destructive" size={25}/><h3 className="font-semibold">Couldn’t load this right now</h3><p className="mt-1 text-sm text-muted-foreground">Your workspace is still here. Try again in a moment.</p><Button secondary onClick={onRetry} testId="button-retry"><RotateCw size={14}/> Try again</Button></Panel>;
  if (hasData === false && empty) return <Panel className="px-6 py-14 text-center">{empty}</Panel>;
  return <>{children}</>;
}
function Empty({ title, body, action }: { title: string; body: string; action?: ReactNode }) { return <div className="mx-auto max-w-sm"><div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-accent/60 text-primary"><Sparkles size={21}/></div><h3 className="font-[var(--app-font-serif)] text-lg font-bold">{title}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>{action && <div className="mt-5 flex justify-center">{action}</div>}</div>; }
function Modal({ title, caption, close, children }: { title: string; caption: string; close: () => void; children: ReactNode }) {
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/35 p-0 backdrop-blur-[2px] sm:items-center sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}><div className="w-full max-w-[520px] rounded-t-[24px] border border-border bg-card p-6 shadow-2xl sm:rounded-[24px] sm:p-7">
    <div className="mb-6 flex justify-between"><div><h2 className="font-[var(--app-font-serif)] text-[22px] font-extrabold tracking-[-.04em]">{title}</h2><p className="mt-1 text-xs text-muted-foreground">{caption}</p></div><button onClick={close} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-muted" aria-label="Close" data-testid="button-modal-close"><X size={17}/></button></div>{children}
  </div></div>;
}
function Feedback({ error, success }: { error?: Error | null; success?: string }) {
  if (!error && !success) return null;
  const message = error?.message?.replace(/^.*?:\s*/, '') || '';
  return <div role="status" data-testid="status-mutation" className={`mb-4 rounded-xl px-4 py-3 text-sm ${error ? 'bg-destructive/10 text-destructive' : 'bg-emerald-700/10 text-emerald-800'}`}>{error ? message || 'Something went wrong. Please try again.' : success}</div>;
}
function Metric({ label, value, helper, icon: Icon, tone = 'teal' }: { label: string; value: ReactNode; helper: string; icon: typeof Boxes; tone?: string }) {
  return <Panel className="relative overflow-hidden p-5 sm:p-6"><div className="flex items-start justify-between"><div><p className="text-xs font-medium text-muted-foreground">{label}</p><p className="mt-3 font-[var(--app-font-serif)] text-[34px] font-extrabold leading-none tracking-[-.05em]">{value}</p></div><span className={`grid h-10 w-10 place-items-center rounded-xl ${tone === 'gold' ? 'bg-accent/70 text-foreground' : tone === 'coral' ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}><Icon size={18}/></span></div><p className="mt-4 text-[11px] text-muted-foreground">{helper}</p></Panel>;
}

function DashboardPage() {
  const query = useGetDashboard(); const data = query.data;
  return <div>
    <PageIntro eyebrow={`Your workspace · ${new Intl.DateTimeFormat('en', { weekday: 'long' }).format(new Date())}, ready when you are`} title="A clear view of the shelves." description="The useful things your team shares, in one place. Here’s how things are looking today." action={<Link href="/reservations" className="btn-primary inline-flex min-h-10 items-center gap-2 rounded-xl px-4 text-[13px] font-semibold" data-testid="link-create-reservation"><Plus size={16}/> Make a reservation</Link>}/>
    <QueryState loading={query.isLoading} error={query.isError} onRetry={() => query.refetch()}>
      {data && <div className="space-y-7">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          <Metric label="Tracked resources" value={data.resourceCount} helper="Across your team’s catalog" icon={Package}/>
          <Metric label="Units on hand" value={data.totalOnHand.toLocaleString()} helper="All locations combined" icon={Boxes} tone="gold"/>
          <Metric label="Active reservations" value={data.activeReservations} helper="Currently booked or upcoming" icon={CalendarDays}/>
          <Metric label="Needs a look" value={data.lowStockCount} helper="Items at or below reorder point" icon={AlertTriangle} tone={data.lowStockCount ? 'coral' : 'teal'}/>
        </div>
        <div className="grid gap-5 xl:grid-cols-[1.4fr_.8fr]">
          <Panel className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-5 py-5 sm:px-6"><div><h2 className="font-[var(--app-font-serif)] text-lg font-extrabold tracking-[-.03em]">Restock watch</h2><p className="mt-1 text-xs text-muted-foreground">A heads-up for things running low.</p></div><Link className="flex items-center gap-1 text-xs font-semibold text-primary" href="/inventory" data-testid="link-view-inventory">View inventory <ArrowRight size={13}/></Link></div>
            {data.lowStockItems.length ? <div className="divide-y divide-border">{data.lowStockItems.slice(0, 6).map((item) => <div key={`${item.resourceId}-${item.locationName}`} className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6" data-testid={`low-stock-item-${item.resourceId}`}><div className="flex min-w-0 items-center gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-destructive/10 text-destructive"><Package size={17}/></span><div className="min-w-0"><p className="truncate text-sm font-semibold">{item.name}</p><p className="mt-1 text-[11px] text-muted-foreground">{item.sku} <span className="mx-1">·</span> {item.locationName}</p></div></div><div className="shrink-0 text-right"><p className="font-[var(--app-font-mono)] text-sm font-medium text-destructive">{item.onHand} <span className="font-sans text-xs text-muted-foreground">left</span></p><p className="mt-1 text-[10px] text-muted-foreground">reorder at {item.reorderPoint}</p></div></div>)}</div> : <div className="px-6 py-10 text-center"><CheckCircle2 className="mx-auto mb-3 text-primary" size={25}/><p className="font-semibold">Shelves looking good</p><p className="mt-1 text-xs text-muted-foreground">Nothing needs a restock right now.</p></div>}
          </Panel>
          <Panel className="relative overflow-hidden bg-primary p-6 text-primary-foreground sm:p-7">
            <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full border border-primary-foreground/10"/><div className="absolute -right-3 -top-3 h-28 w-28 rounded-full border border-primary-foreground/10"/>
            <div className="relative"><p className="text-[10px] font-bold uppercase tracking-[.2em] text-primary-foreground/60">Locations</p><div className="mt-5 flex items-end gap-2"><span className="font-[var(--app-font-serif)] text-6xl font-extrabold leading-none tracking-[-.07em]">{data.locationCount}</span><span className="mb-1 text-sm text-primary-foreground/70">places to find it</span></div><p className="mt-5 max-w-[250px] text-sm leading-relaxed text-primary-foreground/70">From the supply closet to the field kit. Everything has a home.</p><Link href="/inventory" className="mt-7 inline-flex items-center gap-2 rounded-xl bg-primary-foreground px-4 py-2.5 text-xs font-bold text-primary" data-testid="link-explore-locations">Explore inventory <ArrowRight size={14}/></Link></div>
          </Panel>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-muted/50 px-4 py-3 text-xs text-muted-foreground"><CircleHelp size={15} className="shrink-0 text-primary"/>Tip: make a reservation to set aside supplies before your next project.</div>
      </div>}
    </QueryState>
  </div>;
}

function InventoryPage() {
  const qc = useQueryClient(); const [locationId, setLocationId] = useState(''); const [search, setSearch] = useState(''); const [modal, setModal] = useState<'adjust' | 'location' | null>(null);
  const [windowStart, setWindowStart] = useState(''); const [windowEnd, setWindowEnd] = useState('');
  const params = locationId || windowStart || windowEnd ? {
    ...(locationId ? { locationId: Number(locationId) } : {}),
    ...(windowStart ? { startAt: new Date(windowStart).toISOString() } : {}),
    ...(windowEnd ? { endAt: new Date(windowEnd).toISOString() } : {}),
  } : undefined;
  const inventory = useListInventory(params); const locationsQuery = useListLocations(); const resourcesQuery = useListResources();
  const rows = (inventory.data ?? []).filter((row) => `${row.resourceName} ${row.sku} ${row.locationName} ${row.category}`.toLowerCase().includes(search.toLowerCase()));
  const reloadAll = () => { void qc.invalidateQueries({ queryKey: getListInventoryQueryKey() }); void qc.invalidateQueries({ queryKey: getGetDashboardQueryKey() }); void qc.invalidateQueries({ queryKey: getListMovementsQueryKey() }); };
  return <div>
    <PageIntro eyebrow="Know what’s where" title="Inventory" description="Stock levels by place, with a clear view of what’s available after reservations." action={<div className="flex gap-2"><Button secondary onClick={() => setModal('location')} testId="button-add-location"><MapPin size={15}/> Add location</Button><Button onClick={() => setModal('adjust')} testId="button-adjust-stock"><Plus size={16}/> Adjust stock</Button></div>}/>
    <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_210px_190px_190px]">
      <label className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16}/><input className="field pl-9" placeholder="Find an item or location…" value={search} onChange={(e) => setSearch(e.target.value)} data-testid="input-inventory-search"/></label>
      <label className="relative"><SlidersHorizontal className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={15}/><select className="field appearance-none pl-9" value={locationId} onChange={(e) => setLocationId(e.target.value)} data-testid="select-location-filter"><option value="">All locations</option>{(locationsQuery.data ?? []).map((location) => <option value={location.id} key={location.id}>{location.name}</option>)}</select><ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14}/></label>
      <label><span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">From</span><input className="field py-[.57rem] text-xs" type="datetime-local" value={windowStart} onChange={(e) => setWindowStart(e.target.value)} data-testid="input-availability-start"/></label>
      <label><span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Until</span><input className="field py-[.57rem] text-xs" type="datetime-local" value={windowEnd} onChange={(e) => setWindowEnd(e.target.value)} data-testid="input-availability-end"/></label>
    </div>
    <QueryState loading={inventory.isLoading} error={inventory.isError} onRetry={() => inventory.refetch()} hasData={rows.length > 0} empty={<Empty title="No stock to show yet" body="Once resources are in your catalog and stock is recorded, you’ll see it here." action={<Link href="/resources" className="btn-primary inline-flex min-h-10 items-center gap-2 rounded-xl px-4 text-xs font-semibold" data-testid="link-add-first-resource">Add a resource <ArrowRight size={14}/></Link>}/>}>
      <Panel className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-5 py-4"><div><h2 className="text-sm font-bold">Stock by resource</h2><p className="mt-1 text-[11px] text-muted-foreground">{rows.length} entries <span className="mx-1">·</span> availability reflects current reservations</p></div><span className="hidden items-center gap-1 text-[10px] text-muted-foreground sm:flex"><Clock3 size={13}/> Current availability</span></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left"><thead><tr className="bg-muted/55 text-[10px] uppercase tracking-[.14em] text-muted-foreground"><th className="px-5 py-3 font-semibold">Resource</th><th className="px-4 py-3 font-semibold">Location</th><th className="px-4 py-3 text-right font-semibold">On hand</th><th className="px-4 py-3 text-right font-semibold">Reserved</th><th className="px-5 py-3 text-right font-semibold">Available</th></tr></thead><tbody className="divide-y divide-border">{rows.map((row) => <InventoryRow key={`${row.resourceId}-${row.locationId}`} row={row}/>)}</tbody></table></div>
      </Panel>
    </QueryState>
    {modal === 'adjust' && <AdjustModal close={() => setModal(null)} resources={resourcesQuery.data ?? []} locations={locationsQuery.data ?? []} onDone={reloadAll}/>}
    {modal === 'location' && <LocationModal close={() => setModal(null)} onDone={() => { void qc.invalidateQueries({ queryKey: getListLocationsQueryKey() }); void qc.invalidateQueries({ queryKey: getGetDashboardQueryKey() }); }}/>}
  </div>;
}
function InventoryRow({ row }: { row: InventoryLevel }) {
  const low = row.available <= row.reorderPoint;
  return <tr className="transition-colors hover:bg-muted/30" data-testid={`row-inventory-${row.resourceId}-${row.locationId}`}><td className="px-5 py-4"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-accent/50 text-primary"><Package size={16}/></span><div><p className="text-[13px] font-semibold">{row.resourceName}</p><p className="mt-1 text-[10px] text-muted-foreground">{row.sku} <span className="mx-1">·</span> {row.category}</p></div></div></td><td className="px-4 py-4 text-xs text-muted-foreground">{row.locationName}</td><td className="px-4 py-4 text-right font-[var(--app-font-mono)] text-xs">{row.onHand} <span className="font-sans text-[10px] text-muted-foreground">{row.unit}</span></td><td className="px-4 py-4 text-right font-[var(--app-font-mono)] text-xs text-muted-foreground">{row.reserved}</td><td className="px-5 py-4 text-right"><span className={`inline-flex min-w-10 justify-center rounded-lg px-2 py-1 font-[var(--app-font-mono)] text-xs font-medium ${low ? 'bg-destructive/10 text-destructive' : 'bg-emerald-800/10 text-emerald-800'}`}>{row.available}</span>{low && <p className="mt-1 text-[9px] text-destructive">Low stock</p>}</td></tr>;
}
function AdjustModal({ close, resources, locations, onDone }: { close: () => void; resources: Resource[]; locations: Location[]; onDone: () => void }) {
  const [error, setError] = useState<Error | null>(null); const [success, setSuccess] = useState(''); const qc = useQueryClient(); const mutation = useAdjustInventory();
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); setError(null); const fd = new FormData(event.currentTarget); const payload: InventoryAdjustmentInput = { resourceId: Number(fd.get('resourceId')), locationId: Number(fd.get('locationId')), direction: fd.get('direction') as 'in' | 'out', quantity: Number(fd.get('quantity')), reason: String(fd.get('reason')) }; mutation.mutate({ data: payload }, { onSuccess: () => { onDone(); setSuccess('Stock movement recorded.'); window.setTimeout(close, 600); }, onError: (e) => setError(e as Error) }); };
  return <Modal title="Adjust stock" caption="Record a delivery or a stock take correction." close={close}><Feedback error={error} success={success}/><form onSubmit={submit} className="space-y-4">
    <FieldSelect name="resourceId" label="Resource" required options={resources.map((r) => [String(r.id), `${r.name} · ${r.sku}`])}/><FieldSelect name="locationId" label="Location" required options={locations.map((l) => [String(l.id), l.name])}/>
    <div className="grid grid-cols-2 gap-3"><FieldSelect name="direction" label="Movement" required options={ [['in','Stock in'],['out','Stock out']] }/><FieldInput name="quantity" label="Quantity" type="number" min="1" required placeholder="e.g. 12"/></div>
    <FieldInput name="reason" label="Reason" required maxLength={240} placeholder="Delivery, count correction…"/>
    <div className="flex justify-end gap-2 pt-2"><Button secondary onClick={close} testId="button-adjust-cancel">Cancel</Button><Button type="submit" disabled={mutation.isPending || !resources.length || !locations.length} testId="button-adjust-submit">{mutation.isPending ? 'Saving…' : 'Save movement'}</Button></div>
  </form></Modal>;
}
function LocationModal({ close, onDone }: { close: () => void; onDone: () => void }) {
  const [error, setError] = useState<Error | null>(null); const create = useCreateLocation();
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); setError(null); const fd = new FormData(event.currentTarget); create.mutate({ data: { name: String(fd.get('name')), address: String(fd.get('address') || '') } }, { onSuccess: () => { onDone(); close(); }, onError: (e) => setError(e as Error) }); };
  return <Modal title="Add a location" caption="Give shared stock a place to call home." close={close}><Feedback error={error}/><form onSubmit={submit} className="space-y-4"><FieldInput name="name" label="Location name" required maxLength={120} placeholder="North studio, Tool room…"/><FieldInput name="address" label="Address (optional)" maxLength={240} placeholder="Street or helpful directions"/><div className="flex justify-end gap-2 pt-2"><Button secondary onClick={close} testId="button-location-cancel">Cancel</Button><Button type="submit" disabled={create.isPending} testId="button-location-submit">{create.isPending ? 'Saving…' : 'Add location'}</Button></div></form></Modal>;
}

function ResourcesPage() {
  const qc = useQueryClient(); const query = useListResources(); const [modal, setModal] = useState(false); const [search, setSearch] = useState('');
  const resources = (query.data ?? []).filter((r) => `${r.name} ${r.sku} ${r.category}`.toLowerCase().includes(search.toLowerCase()));
  return <div><PageIntro eyebrow="Your shared kit" title="Resources" description="The equipment and supplies your team keeps track of. Make the list yours." action={<Button onClick={() => setModal(true)} testId="button-new-resource"><Plus size={16}/> Add resource</Button>}/>
    <div className="mb-5 flex items-center gap-3"><label className="relative w-full max-w-[420px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16}/><input className="field pl-9" placeholder="Search by name, SKU, or category…" value={search} onChange={(e) => setSearch(e.target.value)} data-testid="input-resource-search"/></label><span className="text-xs text-muted-foreground">{resources.length} resources</span></div>
    <QueryState loading={query.isLoading} error={query.isError} onRetry={() => query.refetch()} hasData={resources.length > 0} empty={<Empty title={search ? 'No matches found' : 'Start your resource list'} body={search ? 'Try another search term.' : 'Add the shared equipment and supplies your team needs to find and reserve.'} action={!search && <Button onClick={() => setModal(true)} testId="button-empty-new-resource"><Plus size={15}/> Add first resource</Button>}/>}>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{resources.map((item) => <ResourceCard key={item.id} item={item}/>)}</div>
    </QueryState>
    {modal && <ResourceModal close={() => setModal(false)} onDone={() => { void qc.invalidateQueries({ queryKey: getListResourcesQueryKey() }); void qc.invalidateQueries({ queryKey: getGetDashboardQueryKey() }); }}/>}
  </div>;
}
function ResourceCard({ item }: { item: Resource }) {
  const accents = ['bg-primary/10 text-primary', 'bg-accent/70 text-foreground', 'bg-emerald-800/10 text-emerald-800', 'bg-destructive/10 text-destructive'];
  const color = accents[item.id % accents.length];
  return <Panel className="p-5 transition-transform hover:-translate-y-0.5" data-testid={`card-resource-${item.id}`}><div className="flex items-start justify-between"><span className={`grid h-10 w-10 place-items-center rounded-xl ${color}`}><Package size={18}/></span><span className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">{item.category}</span></div><h3 className="mt-5 font-[var(--app-font-serif)] text-lg font-extrabold tracking-[-.035em]">{item.name}</h3><p className="mt-1 font-[var(--app-font-mono)] text-[10px] tracking-wide text-muted-foreground">{item.sku}</p><div className="mt-5 flex items-center justify-between border-t border-border pt-4 text-xs"><span className="text-muted-foreground">Reorder point</span><span className="font-[var(--app-font-mono)] font-medium">{item.reorderPoint} <span className="font-sans text-muted-foreground">{item.unit}</span></span></div></Panel>;
}
function ResourceModal({ close, onDone }: { close: () => void; onDone: () => void }) {
  const [error, setError] = useState<Error | null>(null); const create = useCreateResource();
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); setError(null); const fd = new FormData(event.currentTarget); const payload: ResourceInput = { name: String(fd.get('name')), sku: String(fd.get('sku')), category: String(fd.get('category')), unit: String(fd.get('unit')), reorderPoint: Number(fd.get('reorderPoint')) }; create.mutate({ data: payload }, { onSuccess: () => { onDone(); close(); }, onError: (e) => setError(e as Error) }); };
  return <Modal title="Add a resource" caption="Give your shared kit a name and a simple stock threshold." close={close}><Feedback error={error}/><form onSubmit={submit} className="space-y-4"><FieldInput name="name" label="Resource name" required maxLength={120} placeholder="Cordless drill"/><div className="grid grid-cols-2 gap-3"><FieldInput name="sku" label="SKU" required maxLength={40} placeholder="TOOL-014"/><FieldInput name="category" label="Category" required maxLength={60} placeholder="Tools"/></div><div className="grid grid-cols-2 gap-3"><FieldInput name="unit" label="Unit" required maxLength={24} placeholder="each, box…"/><FieldInput name="reorderPoint" label="Reorder at" type="number" min="0" required placeholder="4"/></div><div className="flex justify-end gap-2 pt-2"><Button secondary onClick={close} testId="button-resource-cancel">Cancel</Button><Button type="submit" disabled={create.isPending} testId="button-resource-submit">{create.isPending ? 'Saving…' : 'Add resource'}</Button></div></form></Modal>;
}
function FieldInput({ name, label, type = 'text', required = false, placeholder, min, maxLength }: { name: string; label: string; type?: string; required?: boolean; placeholder?: string; min?: string; maxLength?: number }) {
  return <label className="block"><span className="mb-1.5 block text-xs font-semibold">{label}{required && <span className="ml-1 text-destructive">*</span>}</span><input className="field text-sm" name={name} type={type} required={required} placeholder={placeholder} min={min} maxLength={maxLength} data-testid={`input-${name}`}/></label>;
}
function FieldSelect({ name, label, options, required = false }: { name: string; label: string; options: string[][]; required?: boolean }) {
  return <label className="block"><span className="mb-1.5 block text-xs font-semibold">{label}</span><select className="field text-sm" name={name} required={required} defaultValue="" data-testid={`select-${name}`}><option value="" disabled>Select {label.toLowerCase()}</option>{options.map(([value, labelText]) => <option value={value} key={value}>{labelText}</option>)}</select></label>;
}

function ReservationsPage() {
  const qc = useQueryClient(); const query = useListReservations(); const [modal, setModal] = useState(false); const [filter, setFilter] = useState('all');
  const rows = (query.data ?? []).filter((r) => filter === 'all' || r.status === filter);
  return <div><PageIntro eyebrow="Plan ahead, share fairly" title="Reservations" description="Set aside resources for a time window, then close the loop when they come back." action={<Button onClick={() => setModal(true)} testId="button-new-reservation"><Plus size={16}/> New reservation</Button>}/>
    <div className="mb-5 flex flex-wrap gap-2">{[['all','All bookings'],['confirmed','Confirmed'],['fulfilled','Fulfilled'],['cancelled','Cancelled']].map(([key, label]) => <button key={key} onClick={() => setFilter(key)} className={`rounded-full px-3.5 py-2 text-xs font-semibold transition-colors ${filter === key ? 'bg-primary text-primary-foreground' : 'border border-border bg-card text-muted-foreground hover:bg-muted'}`} data-testid={`filter-reservations-${key}`}>{label}</button>)}</div>
    <QueryState loading={query.isLoading} error={query.isError} onRetry={() => query.refetch()} hasData={rows.length > 0} empty={<Empty title={query.data?.length ? 'Nothing in this view' : 'No reservations yet'} body={query.data?.length ? 'Try another status filter.' : 'Reserve something for a project or teammate and it’ll show up here.'} action={!query.data?.length && <Button onClick={() => setModal(true)} testId="button-empty-reservation"><Plus size={15}/> Create reservation</Button>}/>}>
      <div className="space-y-3">{rows.map((reservation) => <ReservationRow key={reservation.id} reservation={reservation} onUpdated={() => { void qc.invalidateQueries({ queryKey: getListReservationsQueryKey() }); void qc.invalidateQueries({ queryKey: getListInventoryQueryKey() }); void qc.invalidateQueries({ queryKey: getGetDashboardQueryKey() }); }}/>)}</div>
    </QueryState>
    {modal && <ReservationModal close={() => setModal(false)} onDone={() => { void qc.invalidateQueries({ queryKey: getListReservationsQueryKey() }); void qc.invalidateQueries({ queryKey: getListInventoryQueryKey() }); void qc.invalidateQueries({ queryKey: getGetDashboardQueryKey() }); }}/>}
  </div>;
}
function ReservationRow({ reservation: r, onUpdated }: { reservation: Reservation; onUpdated: () => void }) {
  const cancel = useCancelReservation(); const fulfill = useFulfillReservation(); const [error, setError] = useState<Error | null>(null);
  const active = r.status === 'confirmed'; const pending = cancel.isPending || fulfill.isPending;
  const doMutation = (kind: 'cancel' | 'fulfill') => { setError(null); const mutation = kind === 'cancel' ? cancel : fulfill; mutation.mutate({ id: r.id }, { onSuccess: onUpdated, onError: (e) => setError(e as Error) }); };
  return <Panel className="p-4 sm:p-5" data-testid={`card-reservation-${r.id}`}><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent/60 text-primary"><CalendarDays size={18}/></span><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-bold">{r.resourceName}</h3><StatusPill status={r.status}/></div><p className="mt-1 text-xs text-muted-foreground">{r.quantity} units <span className="mx-1">·</span> {r.locationName} <span className="mx-1">·</span> booked by {r.requester}</p><p className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground"><Clock3 size={12}/>{dateTime(r.startAt)} <ArrowRight size={12}/> {dateTime(r.endAt)}</p>{r.notes && <p className="mt-2 text-xs text-foreground/70">{r.notes}</p>}{error && <p className="mt-2 text-xs text-destructive" role="alert">{error.message}</p>}</div></div>{active && <div className="flex shrink-0 gap-2 pl-[52px] sm:pl-0"><Button secondary disabled={pending} onClick={() => doMutation('cancel')} testId={`button-cancel-${r.id}`}>Cancel</Button><Button disabled={pending} onClick={() => doMutation('fulfill')} testId={`button-fulfill-${r.id}`}><Check size={14}/> Fulfill</Button></div>}</div></Panel>;
}
function StatusPill({ status }: { status: string }) {
  const className = status === 'confirmed' ? 'bg-emerald-800/10 text-emerald-800' : status === 'fulfilled' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground';
  return <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${className}`} data-testid={`status-${status}`}>{titleCase(status)}</span>;
}
function ReservationModal({ close, onDone }: { close: () => void; onDone: () => void }) {
  const resources = useListResources(); const locations = useListLocations(); const inventory = useListInventory(); const create = useCreateReservation(); const [error, setError] = useState<Error | null>(null);
  const [selectedResource, setSelectedResource] = useState('');
  const available = useMemo(() => (inventory.data ?? []).filter((row) => !selectedResource || row.resourceId === Number(selectedResource)), [inventory.data, selectedResource]);
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); setError(null); const fd = new FormData(event.currentTarget); const payload: ReservationInput = { resourceId: Number(fd.get('resourceId')), locationId: Number(fd.get('locationId')), quantity: Number(fd.get('quantity')), requester: String(fd.get('requester')), startAt: new Date(String(fd.get('startAt'))).toISOString(), endAt: new Date(String(fd.get('endAt'))).toISOString(), notes: String(fd.get('notes') || '') }; create.mutate({ data: payload }, { onSuccess: () => { onDone(); close(); }, onError: (e) => setError(e as Error) }); };
  return <Modal title="New reservation" caption="Set aside stock for a teammate and a time window." close={close}><Feedback error={error}/><form onSubmit={submit} className="space-y-4">
    <label className="block"><span className="mb-1.5 block text-xs font-semibold">Resource</span><select className="field text-sm" required name="resourceId" value={selectedResource} onChange={(e) => setSelectedResource(e.target.value)} data-testid="select-resourceId"><option value="" disabled>Choose a resource</option>{(resources.data ?? []).map((r) => <option key={r.id} value={r.id}>{r.name} · {r.sku}</option>)}</select></label>
    <label className="block"><span className="mb-1.5 block text-xs font-semibold">Location</span><select className="field text-sm" required name="locationId" defaultValue="" data-testid="select-locationId"><option value="" disabled>Choose a location</option>{available.map((r) => <option key={r.locationId} value={r.locationId}>{r.locationName} — {r.available} available</option>)}</select></label>
    <div className="grid grid-cols-2 gap-3"><FieldInput name="quantity" label="Quantity" type="number" min="1" required placeholder="1"/><FieldInput name="requester" label="Booked for" required maxLength={100} placeholder="Name"/></div>
    <div className="grid grid-cols-2 gap-3"><FieldInput name="startAt" label="Starts" type="datetime-local" required/><FieldInput name="endAt" label="Ends" type="datetime-local" required/></div><FieldInput name="notes" label="Notes (optional)" maxLength={240} placeholder="Project, pickup details…"/>
    <div className="flex justify-end gap-2 pt-2"><Button secondary onClick={close} testId="button-reservation-cancel">Cancel</Button><Button type="submit" disabled={create.isPending || !resources.data?.length || !locations.data?.length} testId="button-reservation-submit">{create.isPending ? 'Saving…' : 'Reserve resource'}</Button></div>
  </form></Modal>;
}

function ActivityPage() {
  const query = useListMovements(); const rows = query.data ?? [];
  return <div><PageIntro eyebrow="A dependable paper trail" title="Activity" description="Every recorded stock-in, stock-out, and fulfilled reservation, in order." action={<span className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-3 text-xs text-muted-foreground"><Activity size={15}/> Recent movements</span>}/>
    <QueryState loading={query.isLoading} error={query.isError} onRetry={() => query.refetch()} hasData={rows.length > 0} empty={<Empty title="A quiet shelf" body="Stock movements will appear here as your team records deliveries, adjustments, and fulfilled bookings." action={<Link href="/inventory" className="btn-primary inline-flex min-h-10 items-center gap-2 rounded-xl px-4 text-xs font-semibold" data-testid="link-activity-inventory">Go to inventory <ArrowRight size={14}/></Link>}/>}>
      <Panel className="overflow-hidden"><div className="border-b border-border px-5 py-5"><h2 className="font-[var(--app-font-serif)] text-lg font-extrabold tracking-[-.03em]">Movement history</h2><p className="mt-1 text-xs text-muted-foreground">Latest {rows.length} records</p></div><div className="divide-y divide-border">{rows.map((row) => <MovementRow key={row.id} movement={row}/>)}</div></Panel>
    </QueryState>
  </div>;
}
function MovementRow({ movement: m }: { movement: StockMovement }) {
  const isIn = m.movementType === 'stock_in'; const isFulfilled = m.movementType === 'order_fulfilled';
  const Icon = isIn ? ArrowDownLeft : isFulfilled ? CheckCircle2 : ArrowUpRight;
  return <div className="flex items-center gap-3 px-5 py-4 sm:gap-4 sm:px-6" data-testid={`row-movement-${m.id}`}><span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${isIn ? 'bg-emerald-800/10 text-emerald-800' : isFulfilled ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}><Icon size={17}/></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="text-[13px] font-semibold">{m.resourceName}</p><span className="text-[10px] text-muted-foreground">{titleCase(m.movementType)}</span></div><p className="mt-1 truncate text-[11px] text-muted-foreground">{m.locationName} <span className="mx-1">·</span> {m.reason}</p></div><div className="shrink-0 text-right"><p className={`font-[var(--app-font-mono)] text-sm font-medium ${isIn ? 'text-emerald-800' : 'text-foreground'}`}>{isIn ? '+' : '−'}{m.quantity}</p><p className="mt-1 text-[10px] text-muted-foreground">{dateTime(m.createdAt)}</p></div></div>;
}
function NotFound() { return <div className="py-20 text-center"><div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-accent text-primary"><Warehouse/></div><p className="text-xs font-bold uppercase tracking-[.2em] text-primary">Wrong aisle</p><h1 className="mt-3 font-[var(--app-font-serif)] text-3xl font-extrabold">We couldn’t find that page.</h1><Link href="/" className="btn-primary mt-6 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold" data-testid="link-home"><ArrowRight size={15}/> Back to overview</Link></div>; }

export default App;