import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { BookOpen, LogOut, Menu, ScanLine, Users, Wallet, X } from 'lucide-react';
import { useApp, useConfig } from '../context/AppContext';
import { money, prettyDate } from '../lib/format';
import { Logo } from './Logo';

const links = [
  { to: '/admin', label: 'Attendance', icon: ScanLine, end: true },
  { to: '/admin/students', label: 'Students', icon: Users, end: false },
  { to: '/admin/fees', label: 'Fees', icon: Wallet, end: false },
  { to: '/admin/marks', label: 'Marks', icon: BookOpen, end: false },
];

export function Layout() {
  const config = useConfig();
  const { logout } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const current = links.find((link) => (link.end ? location.pathname === link.to : location.pathname.startsWith(link.to)));
    document.title = `${current?.label ?? 'Smart Class'} · ${config.className}`;
  }, [config.className, location.pathname]);

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[248px_1fr]">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2">
        Skip to content
      </a>
      {open ? <button type="button" className="fixed inset-0 z-30 bg-ink/40 lg:hidden" aria-label="Close menu" onClick={() => setOpen(false)} /> : null}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[248px] flex-col bg-board text-white transition lg:static lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center gap-3 px-5 py-6">
          <Logo className="h-10 w-10" />
          <div>
            <p className="font-display text-xl leading-none">Smart Class</p>
            <p className="mt-1 text-xs text-white/60">Teacher · Grades 9–11</p>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3">
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl border-l-2 px-3 py-2.5 text-sm ${
                    isActive ? 'border-gold bg-white/10 text-white' : 'border-transparent text-white/70 hover:bg-white/5 hover:text-white'
                  }`
                }
              >
                <Icon className="h-4 w-4" />
                {link.label}
              </NavLink>
            );
          })}
        </nav>
        <div className="space-y-2 px-5 py-5 text-xs text-white/70">
          <p className="font-medium text-white">{config.teacherName}</p>
          <a className="block hover:text-white" href={`tel:${config.teacherPhone}`}>
            {config.teacherPhone}
          </a>
          <p>{money(config.defaultMonthlyFee, config.currency)} per student each month</p>
          <p className="text-white/50">{prettyDate(config.today)}</p>
          <button
            type="button"
            className="inline-flex items-center gap-2 text-white/80 hover:text-white"
            onClick={() => {
              logout();
              navigate('/');
            }}
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-mist bg-chalk/90 px-4 py-3 backdrop-blur lg:hidden">
          <button type="button" className="btn-ghost px-2" onClick={() => setOpen(true)} aria-label="Open menu">
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
          <p className="font-display text-lg">Teacher</p>
        </header>
        <main id="main" className="mx-auto w-full max-w-6xl px-4 py-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
