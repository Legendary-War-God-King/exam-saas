import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import ProtectedRoute from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import Modal from '@/components/Modal';
import api from '@/lib/api';

interface Exam {
  id: string; title: string; status: string; timeLimit: number; passScore: number;
  _count: { examQuestions: number }; createdAt: string;
}

export default function ExamsPage() {
  const router = useRouter();
  const [exams, setExams] = useState<Exam[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', timeLimit: 30, passScore: 60, antiCheat: true });

  const fetchExams = () => {
    api.get('/exams').then((r) => setExams(r.data));
  };
  useEffect(() => { fetchExams(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post('/exams', {
      title: form.title, description: form.description || undefined,
      timeLimit: Number(form.timeLimit), passScore: Number(form.passScore), antiCheat: form.antiCheat,
    });
    setShowCreate(false);
    setForm({ title: '', description: '', timeLimit: 30, passScore: 60, antiCheat: true });
    fetchExams();
  };

  const statusLabel = (s: string) => {
    const map: Record<string, string> = { DRAFT: '草稿', PUBLISHED: '已发布', IN_PROGRESS: '进行中', FINISHED: '已结束' };
    return map[s] ?? s;
  };
  const statusCls = (s: string) => {
    const map: Record<string, string> = { DRAFT: 'bg-gray-100 text-gray-600', PUBLISHED: 'bg-green-100 text-green-700', IN_PROGRESS: 'bg-blue-100 text-blue-700', FINISHED: 'bg-orange-100 text-orange-700' };
    return map[s] ?? 'bg-gray-100';
  };

  return (
    <ProtectedRoute>
      <Layout title="考试管理">
        <div className="flex justify-end mb-4">
          <button onClick={() => setShowCreate(true)} className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm hover:bg-blue-700">创建考试</button>
        </div>
        <div className="bg-white rounded-lg shadow">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="pb-2 px-4">标题</th><th className="pb-2 px-4">时长(分)</th><th className="pb-2 px-4">及格分</th><th className="pb-2 px-4">题目数</th><th className="pb-2 px-4">状态</th>
              </tr>
            </thead>
            <tbody>
              {exams.map((e) => (
                <tr key={e.id} className="border-b last:border-0 cursor-pointer hover:bg-gray-50"
                  onClick={() => router.push(`/dashboard/exams/${e.id}`)}>
                  <td className="py-2 px-4">{e.title}</td>
                  <td className="py-2 px-4">{e.timeLimit}</td>
                  <td className="py-2 px-4">{e.passScore}</td>
                  <td className="py-2 px-4">{e._count.examQuestions}</td>
                  <td className="py-2 px-4">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusCls(e.status)}`}>{statusLabel(e.status)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {exams.length === 0 && <p className="text-gray-400 text-center py-12">暂无考试，点击上方按钮创建</p>}
        </div>

        <Modal open={showCreate} onClose={() => setShowCreate(false)} title="创建考试">
          <form onSubmit={handleCreate} className="space-y-3">
            <input placeholder="标题" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full border rounded px-3 py-1.5 text-sm" required />
            <input placeholder="描述" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full border rounded px-3 py-1.5 text-sm" />
            <div className="flex gap-2">
              <input type="number" placeholder="时长(分钟)" value={form.timeLimit} onChange={(e) => setForm({ ...form, timeLimit: parseInt(e.target.value) || 30 })}
                className="flex-1 border rounded px-3 py-1.5 text-sm" min={1} />
              <input type="number" placeholder="及格分" value={form.passScore} onChange={(e) => setForm({ ...form, passScore: parseInt(e.target.value) || 60 })}
                className="flex-1 border rounded px-3 py-1.5 text-sm" min={0} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.antiCheat} onChange={(e) => setForm({ ...form, antiCheat: e.target.checked })} />
              启用防作弊
            </label>
            <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded text-sm hover:bg-blue-700">创建</button>
          </form>
        </Modal>
      </Layout>
    </ProtectedRoute>
  );
}
