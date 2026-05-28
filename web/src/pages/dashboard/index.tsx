import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import api from '@/lib/api';

export default function DashboardPage() {
  const [banks, setBanks] = useState<unknown[]>([]);
  const [exams, setExams] = useState<unknown[]>([]);
  const [users, setUsers] = useState<unknown[]>([]);

  useEffect(() => {
    api.get('/question-banks').then((r) => setBanks(r.data));
    api.get('/exams').then((r) => setExams(r.data));
    api.get('/tenant/users').then((r) => setUsers(r.data.data ?? []));
  }, []);

  return (
    <ProtectedRoute>
      <Layout title="首页">
        <div className="grid grid-cols-3 gap-4 mb-8">
          <StatCard label="题库数量" value={banks.length} color="blue" />
          <StatCard label="考试数量" value={exams.length} color="green" />
          <StatCard label="用户数量" value={users.length} color="purple" />
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-semibold mb-4">最近考试</h3>
          {exams.length === 0 ? (
            <p className="text-gray-400 text-sm">暂无考试</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="pb-2">标题</th>
                  <th className="pb-2">状态</th>
                  <th className="pb-2">题目数</th>
                </tr>
              </thead>
              <tbody>
                {(exams as Array<{ id: string; title: string; status: string; _count: { examQuestions: number } }>)
                  .slice(0, 5)
                  .map((e) => (
                    <tr key={e.id} className="border-b last:border-0">
                      <td className="py-2">{e.title}</td>
                      <td className="py-2">
                        <StatusBadge status={e.status} />
                      </td>
                      <td className="py-2">{e._count.examQuestions}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </div>
      </Layout>
    </ProtectedRoute>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700',
    purple: 'bg-purple-50 text-purple-700',
  };
  return (
    <div className={`rounded-lg p-6 ${colors[color]}`}>
      <p className="text-sm opacity-75">{label}</p>
      <p className="text-3xl font-bold">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    DRAFT: { label: '草稿', cls: 'bg-gray-200 text-gray-600' },
    PUBLISHED: { label: '已发布', cls: 'bg-green-100 text-green-700' },
    IN_PROGRESS: { label: '进行中', cls: 'bg-blue-100 text-blue-700' },
    FINISHED: { label: '已结束', cls: 'bg-orange-100 text-orange-700' },
  };
  const s = map[status] ?? { label: status, cls: 'bg-gray-100' };
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${s.cls}`}>{s.label}</span>;
}
