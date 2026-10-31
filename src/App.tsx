import { useEffect, useMemo, useState } from 'react';
import { Home, LogOut, CloudOff, AlertTriangle, X, Radio } from 'lucide-react';
import { useHomebase } from './lib/useHomebase';
import type { Filters } from './lib/tasks';
import { assignees as listAssignees, isFiltering, matches, sortedAreas } from './lib/tasks';
import { Summary } from './components/Summary';
import { WorkOrderCard } from './components/WorkOrderCard';
import { Toolbar } from './components/Toolbar';
import { AddTaskForm } from './components/AddTaskForm';
import { AreaGroup } from './components/AreaGroup';
import { AddAreaForm } from './components/AddAreaForm';
import { DataTools } from './components/DataTools';
import { SignIn } from './components/SignIn';

const COLLAPSE_KEY = 'homebase-collapsed-areas';

function loadCollapsed(): Set<string> {
  try {
    const v = JSON.parse(localStorage.getItem(COLLAPSE_KEY) ?? '[]');
    return new Set(Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []);
  } catch {
    return new Set();
  }
}

export default function App() {
  const { mode, data, loading, error, saveFailed, session, isEditor, canEdit, actions } = useHomebase();
  const [filters, setFilters] = useState<Filters>({ search: '', status: 'all', area: '', assignee: '' });
  const [collapsed, setCollapsed] = useState<Set<string>>(loadCollapsed);
  const [showSignIn, setShowSignIn] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSE_KEY, JSON.stringify([...collapsed]));
    } catch {
      /* ignore */
    }
  }, [collapsed]);

  useEffect(() => {
    if (session) setShowSignIn(false);
  }, [session]);

  const areas = useMemo(() => sortedAreas(data.areas), [data.areas]);
  const people = useMemo(() => listAssignees(data.tasks), [data.tasks]);
  const filtering = isFiltering(filters);
  const visible = useMemo(() => data.tasks.filter((t) => matches(t, filters)), [data.tasks, filters]);

  // Areas from tasks that somehow lack an area row (defensive) are still shown.
  const allAreas = useMemo(() => {
    const names = new Set(areas.map((a) => a.name));
    const extra = [...new Set(data.tasks.map((t) => t.area))]
      .filter((n) => !names.has(n))
      .map((n, i) => ({ id: `orphan-${n}`, name: n, order: 10_000 + i }));
    return [...areas, ...extra];
  }, [areas, data.tasks]);

  const groups = allAreas
    .filter((a) => !filters.area || a.name === filters.area)
    .map((a) => ({ area: a, all: data.tasks.filter((t) => t.area === a.name), visible: visible.filter((t) => t.area === a.name) }))
    .filter((g) => !filtering || g.visible.length > 0);

  const toggleCollapse = (name: string) =>
    setCollapsed((s) => {
      const n = new Set(s);
      if (n.has(name)) n.delete(name);
      else n.add(name);
      return n;
    });

  return (
    <>
      <a href="#main" className="skip-link">Skip to tasks</a>
      <header className="app-header">
        <div className="brand">
          <Home size={26} aria-hidden="true" />
          <div>
            <h1>Homebase</h1>
            <p className="tagline">Project Tracker</p>
          </div>
        </div>
        {mode === 'cloud' && (
          <div className="auth">
            {session ? (
              <>
                <span className="who" title={session.user.email ?? ''}>{isEditor ? 'Owner' : 'View only'}</span>
                <button type="button" className="btn btn-ghost btn-sm" onClick={actions.signOut}>
                  <LogOut size={16} aria-hidden="true" /> Sign out
                </button>
              </>
            ) : (
              <button type="button" className="link-btn" onClick={() => setShowSignIn((v) => !v)}>Owner sign in</button>
            )}
          </div>
        )}
      </header>

      <main id="main" className="container" tabIndex={-1}>
        {mode === 'local' && (
          <p className="banner banner-info" role="note">
            <CloudOff size={18} aria-hidden="true" />
            <span>Local mode: data is saved only in this browser. Use Export to back it up.</span>
          </p>
        )}
        {mode === 'local' && saveFailed && (
          <p className="banner banner-error" role="alert">
            <AlertTriangle size={18} aria-hidden="true" />
            <span>Couldn't save to this browser's storage (private mode or storage full). Export a backup now.</span>
          </p>
        )}
        {mode === 'cloud' && !canEdit && !loading && (
          <p className="banner banner-live" role="note">
            <Radio size={18} aria-hidden="true" />
            <span>Live view — progress updates automatically.</span>
          </p>
        )}
        {error && (
          <div className="banner banner-error" role="alert">
            <AlertTriangle size={18} aria-hidden="true" />
            <span>{error}</span>
            <button type="button" className="icon-btn" aria-label="Dismiss" onClick={actions.dismissError}>
              <X size={18} aria-hidden="true" />
            </button>
          </div>
        )}
        {session && !isEditor && mode === 'cloud' && (
          <p className="banner banner-info" role="note">Signed in as {session.user.email}, but this account isn't an editor.</p>
        )}

        {showSignIn && !session && <SignIn onClose={() => setShowSignIn(false)} />}

        {loading ? (
          <p className="card empty" role="status">Loading tasks…</p>
        ) : (
          <>
            <Summary tasks={data.tasks} />
            <WorkOrderCard />
            {canEdit && <AddTaskForm areas={areas} onAdd={actions.addTask} />}
            <Toolbar
              filters={filters}
              onChange={setFilters}
              areas={allAreas}
              assignees={people}
              onCollapseAll={() => setCollapsed(new Set(allAreas.map((a) => a.name)))}
              onExpandAll={() => setCollapsed(new Set())}
            />
            <p className="visually-hidden" role="status" aria-live="polite">
              {filtering ? `${visible.length} matching tasks` : ''}
            </p>

            {data.tasks.length === 0 && allAreas.length === 0 ? (
              <div className="card empty">
                <p>No tasks yet.</p>
                {canEdit && <p className="muted">Add an area below, then add your first task — or import a backup.</p>}
              </div>
            ) : groups.length === 0 ? (
              <div className="card empty">
                <p>No tasks match these filters.</p>
                <button type="button" className="btn" onClick={() => setFilters({ search: '', status: 'all', area: '', assignee: '' })}>
                  Clear filters
                </button>
              </div>
            ) : (
              groups.map((g) => (
                <AreaGroup
                  key={g.area.id}
                  area={g.area}
                  allTasks={g.all}
                  visible={g.visible}
                  areas={allAreas}
                  canEdit={canEdit}
                  collapsed={collapsed.has(g.area.name)}
                  filtering={filtering}
                  onToggleCollapse={() => toggleCollapse(g.area.name)}
                  onRename={(o, n) => {
                    const ok = actions.renameArea(o, n);
                    if (ok && collapsed.has(o)) setCollapsed((s) => new Set([...s].map((x) => (x === o ? n : x))));
                    if (ok && filters.area === o) setFilters({ ...filters, area: n });
                    return ok;
                  }}
                  onToggle={actions.toggle}
                  onUpdate={actions.updateTask}
                  onDelete={actions.deleteTask}
                />
              ))
            )}

            {canEdit && <AddAreaForm onAdd={actions.addArea} />}
            <DataTools data={data} canEdit={canEdit} onReplace={actions.replaceAll} onReset={actions.resetToSeed} />
          </>
        )}
        <datalist id="assignee-list">
          {people.map((p) => <option key={p} value={p} />)}
        </datalist>
        <footer className="footer">
          {mode === 'cloud' ? 'Live data from Supabase.' : 'Browser-only mode.'}
        </footer>
      </main>
    </>
  );
}
