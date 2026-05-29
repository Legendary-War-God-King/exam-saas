import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import ProtectedRoute from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import Modal from '@/components/Modal';
import api from '@/lib/api';

interface Bank {
  id: string; name: string; description: string | null; createdAt: string;
  _count: { questions: number };
}

export default function QuestionBanksPage() {
  const router = useRouter();
  const [banks, setBanks] = useState<Bank[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [error, setError] = useState('');

  const fetchBanks = () => {
    api.get('/question-banks').then((r) => setBanks(r.data));
  };
  useEffect(() => { fetchBanks(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/question-banks', { name, description: desc || undefined });
      setShowCreate(false); setName(''); setDesc('');
      fetchBanks();
    } catch {
      setError('创建题库失败，请重试');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除？')) return;
    try {
      await api.delete(`/question-banks/${id}`);
      fetchBanks();
    } catch {
      setError('删除题库失败，请重试');
    }
  };

  return (
    <ProtectedRoute>
      <Layout title="题库管理">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 flex justify-between">
            <span>{error}</span>
            <button onClick={() => setError('')} className="text-red-400 hover:text-red-600">&times;</button>
          </div>
        )}
        <div className="flex justify-end mb-4">
          <button onClick={() => setShowCreate(true)} className="bg-brand-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors">创建题库</button>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {banks.map((b) => (
            <div key={b.id} className="bg-white rounded-lg shadow p-5 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => router.push(`/dashboard/question-banks/${b.id}`)}>
              <h3 className="font-semibold mb-1">{b.name}</h3>
              <p className="text-sm text-gray-500 mb-3">{b.description ?? '无描述'}</p>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-400">{b._count.questions} 道题</span>
                <button onClick={(e) => { e.stopPropagation(); handleDelete(b.id); }}
                  className="text-xs text-red-500 hover:underline">删除</button>
              </div>
            </div>
          ))}
        </div>
        {banks.length === 0 && <p className="text-gray-400 text-center py-12">暂无题库，点击上方按钮创建</p>}

        <Modal open={showCreate} onClose={() => setShowCreate(false)} title="创建题库">
          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <label className="block text-sm mb-1">名称</label>
              <input value={name} onChange={(e) => setName(e.target.value)}
                className="w-full border rounded px-3 py-1.5 text-sm" required />
            </div>
            <div>
              <label className="block text-sm mb-1">描述</label>
              <input value={desc} onChange={(e) => setDesc(e.target.value)}
                className="w-full border rounded px-3 py-1.5 text-sm" />
            </div>
            <button type="submit" className="w-full bg-brand-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors">创建</button>
          </form>
        </Modal>
      </Layout>
    </ProtectedRoute>
  );
}
