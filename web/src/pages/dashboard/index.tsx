import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import api from '@/lib/api';

export default function DashboardPage() {
  const [banks, setBanks] = useState<unknown[]>([]);
  const [exams, setExams] = useState<unknown[]>([]);
  const [users, setUsers] = useState<number>(0);

  useEffect(() => {
    api.get('/question-banks').then((r) => setBanks(r.data));
    api.get('/exams').then((r) => setExams(r.data));
    api.get('/tenant/users').then((r) => setUsers(r.data.total ?? 0));
  }, []);

  return (
    <ProtectedRoute>
      <Layout title="首页">
        <div className="grid grid-cols-3 gap-5 mb-8">
          <StatCard label="题库数量" value={banks.length} color="blue" delay="stagger-1" />
          <StatCard label="考试数量" value={exams.length} color="emerald" delay="stagger-2" />
          <StatCard label="用户数量" value={users} color="violet" delay="stagger-3" />
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm animate-slide-up stagger-4">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-800">最近考试</h3>
          </div>
          <div className="p-6">
            {exams.length === 0 ? (
              <p className="text-slate-400 text-sm">暂无考试</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-400 text-xs uppercase tracking-wider">
                    <th className="pb-3 font-medium">标题</th>
                    <th className="pb-3 font-medium">状态</th>
                    <th className="pb-3 font-medium text-right">题目数</th>
                  </tr>
                </thead>
                <tbody>
                  {(exams as Array<{ id: string; title: string; status: string; _count: { examQuestions: number } }>)
                    .slice(0, 5)
                    .map((e) => (
                      <tr key={e.id} className="border-b border-slate-50 last:border-0">
                        <td className="py-2.5 text-slate-700">{e.title}</td>
                        <td className="py-2.5">
                          <StatusBadge status={e.status} />
                        </td>
                        <td className="py-2.5 text-right font-mono text-slate-500">{e._count.examQuestions}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}

function StatCard({ label, value, color, delay }: { label: string; value: number; color: string; delay: string }) {
  const colors: Record<string, { bg: string; text: string; dot: string }> = {
    blue: { bg: 'bg-brand-50', text: 'text-brand-700', dot: 'bg-brand-500' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
    violet: { bg: 'bg-violet-50', text: 'text-violet-700', dot: 'bg-violet-500' },
  };
  const c = colors[color];
  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-6 shadow-sm animate-slide-up ${delay}`}>
      <div className="flex items-center gap-2 mb-3">
        <span className={`w-2 h-2 rounded-full ${c.dot}`} />
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{label}</p>
      </div>
      <p className={`text-3xl font-bold font-mono ${c.text}`}>{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    DRAFT: { label: '草稿', cls: 'bg-slate-100 text-slate-500' },
    PUBLISHED: { label: '已发布', cls: 'bg-emerald-50 text-emerald-700' },
    IN_PROGRESS: { label: '进行中', cls: 'bg-brand-50 text-brand-700' },
    FINISHED: { label: '已结束', cls: 'bg-amber-50 text-amber-700' },
  };
  const s = map[status] ?? { label: status, cls: 'bg-slate-50 text-slate-400' };
  return <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${s.cls}`}>{s.label}</span>;
}
