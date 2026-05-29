import { useAuthStore } from '@/lib/store';
import Sidebar from './Sidebar';

export default function Layout({ children, title }: { children: React.ReactNode; title: string }) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="font-semibold text-slate-800">{title}</h2>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="inline-flex items-center gap-1.5 text-slate-500">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              {user?.name}
            </span>
            <button
              onClick={logout}
              className="text-slate-400 hover:text-red-500 transition-colors"
            >
              退出
            </button>
          </div>
        </header>
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
