import Link from 'next/link';
import { useRouter } from 'next/router';

const links = [
  { href: '/dashboard', label: '首页', icon: 'H', color: 'bg-brand-500' },
  { href: '/dashboard/users', label: '用户管理', icon: 'U', color: 'bg-emerald-500' },
  { href: '/dashboard/question-banks', label: '题库管理', icon: 'Q', color: 'bg-violet-500' },
  { href: '/dashboard/exams', label: '考试管理', icon: 'E', color: 'bg-amber-500' },
];

export default function Sidebar() {
  const router = useRouter();

  return (
    <aside className="w-56 bg-slate-900 text-white min-h-screen p-4 flex flex-col">
      <div className="mb-8 mt-2">
        <h1 className="text-xl font-bold tracking-tight">
          <span className="text-brand-500">Exam</span>
          <span className="text-slate-300 font-normal">SaaS</span>
        </h1>
        <p className="text-slate-500 text-xs mt-0.5">在线考试管理平台</p>
      </div>

      <nav className="flex-1 space-y-0.5">
        {links.map((l) => {
          const active = router.pathname.startsWith(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
                active
                  ? 'bg-slate-800 text-white font-medium'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <span
                className={`w-5 h-5 flex items-center justify-center rounded text-[10px] font-bold ${l.color}`}
                aria-hidden="true"
              >
                {l.icon}
              </span>
              {l.label}
            </Link>
          );
        })}
      </nav>

      <div className="pt-4 border-t border-slate-800">
        <p className="text-slate-600 text-xs">Exam SaaS v0.1</p>
      </div>
    </aside>
  );
}
