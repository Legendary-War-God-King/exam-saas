import Link from 'next/link';
import { useRouter } from 'next/router';

const links = [
  { href: '/dashboard', label: '首页', icon: 'H' },
  { href: '/dashboard/users', label: '用户管理', icon: 'U' },
  { href: '/dashboard/question-banks', label: '题库管理', icon: 'Q' },
  { href: '/dashboard/exams', label: '考试管理', icon: 'E' },
];

export default function Sidebar() {
  const router = useRouter();
  return (
    <aside className="w-56 bg-gray-900 text-white min-h-screen p-4">
      <h1 className="text-lg font-bold mb-6">Exam SaaS</h1>
      <nav className="space-y-1">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`flex items-center gap-2 px-3 py-2 rounded text-sm ${
              router.pathname.startsWith(l.href) ? 'bg-gray-700' : 'hover:bg-gray-800'
            }`}
          >
            <span className="w-5 h-5 flex items-center justify-center bg-gray-600 rounded text-xs">
              {l.icon}
            </span>
            {l.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
