import { useAuthStore } from '@/lib/store';
import Sidebar from './Sidebar';

export default function Layout({ children, title }: { children: React.ReactNode; title: string }) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <header className="h-14 bg-white border-b flex items-center justify-between px-6">
          <h2 className="font-semibold text-gray-700">{title}</h2>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-gray-500">{user?.name}</span>
            <button onClick={logout} className="text-red-500 hover:underline">
              退出
            </button>
          </div>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
