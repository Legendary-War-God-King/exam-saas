import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import ProtectedRoute from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import Modal from '@/components/Modal';
import api from '@/lib/api';

interface Question {
  id: string; type: string; content: string; options: Record<string, string> | null;
  answer: string; difficulty: number; tags: string[]; createdAt: string;
}

const QUESTION_TYPES = ['SINGLE_CHOICE', 'MULTI_CHOICE', 'TRUE_FALSE', 'FILL_BLANK'];

export default function QuestionBankDetailPage() {
  const router = useRouter();
  const { id } = router.query as { id: string };
  const [questions, setQuestions] = useState<Question[]>([]);
  const [bankName, setBankName] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importJson, setImportJson] = useState('');
  const [editQ, setEditQ] = useState<Question | null>(null);

  const [form, setForm] = useState({ type: 'SINGLE_CHOICE', content: '', answer: '', difficulty: 1, tags: '', options: '' });

  useEffect(() => {
    if (!id) return;
    api.get(`/question-banks/${id}`).then((r) => setBankName(r.data.name));
    api.get(`/question-banks/${id}/questions`, { params: { limit: 100 } }).then((r) => setQuestions(r.data.data));
  }, [id]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    let options: Record<string, string> | undefined;
    if (form.options) {
      try { options = JSON.parse(form.options); } catch { /* ignore */ }
    }
    await api.post(`/question-banks/${id}/questions`, {
      type: form.type, content: form.content, answer: form.answer,
      difficulty: form.difficulty, tags: form.tags ? form.tags.split(',').map((s) => s.trim()) : [],
      options,
    });
    setShowCreate(false);
    setForm({ type: 'SINGLE_CHOICE', content: '', answer: '', difficulty: 1, tags: '', options: '' });
    const r = await api.get(`/question-banks/${id}/questions`, { params: { limit: 100 } });
    setQuestions(r.data.data);
  };

  const handleImport = async () => {
    try {
      const rows = JSON.parse(importJson);
      const res = await api.post(`/question-banks/${id}/questions/import`, { rows });
      alert(`导入完成: ${res.data.imported} 条`);
      setShowImport(false); setImportJson('');
      const r = await api.get(`/question-banks/${id}/questions`, { params: { limit: 100 } });
      setQuestions(r.data.data);
    } catch { alert('JSON 格式错误'); }
  };

  const handleDelete = async (qid: string) => {
    if (!confirm('确定删除？')) return;
    await api.delete(`/questions/${qid}`);
    const r = await api.get(`/question-banks/${id}/questions`, { params: { limit: 100 } });
    setQuestions(r.data.data);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editQ) return;
    await api.patch(`/questions/${editQ.id}`, { content: editQ.content, answer: editQ.answer, difficulty: editQ.difficulty });
    setEditQ(null);
    const r = await api.get(`/question-banks/${id}/questions`, { params: { limit: 100 } });
    setQuestions(r.data.data);
  };

  return (
    <ProtectedRoute>
      <Layout title={`题库: ${bankName}`}>
        <div className="flex gap-2 mb-4">
          <button onClick={() => setShowCreate(true)} className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm hover:bg-blue-700">创建题目</button>
          <button onClick={() => setShowImport(true)} className="border px-4 py-1.5 rounded text-sm hover:bg-gray-50">批量导入 (JSON)</button>
          <button onClick={() => router.push('/dashboard/question-banks')} className="border px-4 py-1.5 rounded text-sm hover:bg-gray-50 ml-auto">返回题库列表</button>
        </div>

        <div className="bg-white rounded-lg shadow">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="pb-2 px-4">题型</th><th className="pb-2 px-4">题干</th><th className="pb-2 px-4">答案</th><th className="pb-2 px-4">难度</th><th className="pb-2 px-4">标签</th><th className="pb-2 px-4">操作</th>
              </tr>
            </thead>
            <tbody>
              {questions.map((q) => (
                <tr key={q.id} className="border-b last:border-0">
                  <td className="py-2 px-4">{q.type}</td>
                  <td className="py-2 px-4 max-w-xs truncate">{q.content}</td>
                  <td className="py-2 px-4">{q.answer}</td>
                  <td className="py-2 px-4">{q.difficulty}</td>
                  <td className="py-2 px-4 text-gray-400">{(q.tags ?? []).join(', ')}</td>
                  <td className="py-2 px-4 flex gap-2">
                    <button onClick={() => setEditQ(q)} className="text-blue-600 text-xs hover:underline">编辑</button>
                    <button onClick={() => handleDelete(q.id)} className="text-red-500 text-xs hover:underline">删除</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {questions.length === 0 && <p className="text-gray-400 text-center py-8">暂无题目</p>}
        </div>

        <Modal open={showCreate} onClose={() => setShowCreate(false)} title="创建题目">
          <form onSubmit={handleCreate} className="space-y-2">
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="w-full border rounded px-3 py-1.5 text-sm">
              {QUESTION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <input placeholder="题干" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })}
              className="w-full border rounded px-3 py-1.5 text-sm" required />
            <input placeholder='选项 JSON (例: {"A":"80","B":"443"})' value={form.options} onChange={(e) => setForm({ ...form, options: e.target.value })}
              className="w-full border rounded px-3 py-1.5 text-sm" />
            <input placeholder="答案" value={form.answer} onChange={(e) => setForm({ ...form, answer: e.target.value })}
              className="w-full border rounded px-3 py-1.5 text-sm" required />
            <input type="number" placeholder="难度 1-5" value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: parseInt(e.target.value) })}
              className="w-full border rounded px-3 py-1.5 text-sm" min={1} max={5} />
            <input placeholder="标签 (逗号分隔)" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })}
              className="w-full border rounded px-3 py-1.5 text-sm" />
            <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded text-sm hover:bg-blue-700">创建</button>
          </form>
        </Modal>

        <Modal open={showImport} onClose={() => setShowImport(false)} title="批量导入 (JSON)">
          <textarea value={importJson} onChange={(e) => setImportJson(e.target.value)}
            className="w-full border rounded px-3 py-1.5 text-sm h-40 mb-3" placeholder='[{"type":"SINGLE_CHOICE","content":"...","answer":"A","difficulty":1,"tags":[]}]' />
          <button onClick={handleImport} className="w-full bg-blue-600 text-white py-2 rounded text-sm hover:bg-blue-700">导入</button>
        </Modal>

        <Modal open={!!editQ} onClose={() => setEditQ(null)} title="编辑题目">
          {editQ && (
            <form onSubmit={handleUpdate} className="space-y-2">
              <input value={editQ.content} onChange={(e) => setEditQ({ ...editQ, content: e.target.value })}
                className="w-full border rounded px-3 py-1.5 text-sm" required />
              <input value={editQ.answer} onChange={(e) => setEditQ({ ...editQ, answer: e.target.value })}
                className="w-full border rounded px-3 py-1.5 text-sm" required />
              <input type="number" value={editQ.difficulty} onChange={(e) => setEditQ({ ...editQ, difficulty: parseInt(e.target.value) })}
                className="w-full border rounded px-3 py-1.5 text-sm" min={1} max={5} />
              <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded text-sm hover:bg-blue-700">保存</button>
            </form>
          )}
        </Modal>
      </Layout>
    </ProtectedRoute>
  );
}
