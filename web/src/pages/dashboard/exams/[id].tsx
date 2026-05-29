import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import ProtectedRoute from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import Modal from '@/components/Modal';
import api from '@/lib/api';

interface ExamDetail {
  id: string; title: string; description: string | null; timeLimit: number;
  passScore: number; antiCheat: boolean; status: string; accessCode: string | null;
  examQuestions: Array<{
    score: number; sortOrder: number;
    question: { id: string; type: string; content: string; options: unknown; answer: string; difficulty: number };
  }>;
}

export default function ExamDetailPage() {
  const router = useRouter();
  const { id } = router.query as { id: string };
  const [exam, setExam] = useState<ExamDetail | null>(null);
  const [tab, setTab] = useState<'paper' | 'analysis'>('paper');
  const [stats, setStats] = useState<Record<string, unknown> | null>(null);
  const [analysis, setAnalysis] = useState<unknown[]>([]);
  const [results, setResults] = useState<unknown[]>([]);
  const [accessCode, setAccessCode] = useState<string | null>(null);
  const [showAddQ, setShowAddQ] = useState(false);
  const [banks, setBanks] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedBank, setSelectedBank] = useState('');
  const [bankQuestions, setBankQuestions] = useState<Array<{ id: string; content: string }>>([]);
  const [error, setError] = useState('');

  const fetchExam = () => {
    if (!id) return;
    api.get(`/exams/${id}`).then((r) => { setExam(r.data); setAccessCode(r.data.accessCode ?? null); });
  };

  useEffect(() => { fetchExam(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchAnalysis = () => {
    if (!id) return;
    api.get(`/exams/${id}/statistics`).then((r) => setStats(r.data));
    api.get(`/exams/${id}/analysis`).then((r) => setAnalysis(r.data));
    api.get(`/exams/${id}/results`).then((r) => setResults(r.data.data ?? []));
  };

  useEffect(() => {
    if (tab === 'analysis') fetchAnalysis();
  }, [tab, id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePublish = async () => {
    if (!id) return;
    setError('');
    try {
      const res = await api.patch(`/exams/${id}/publish`);
      setAccessCode(res.data.accessCode);
      fetchExam();
    } catch {
      setError('发布失败，请确保考试至少含一道题目且状态为草稿');
    }
  };

  const handleAddQuestion = async (questionId: string) => {
    try {
      await api.post(`/exams/${id}/questions`, { questionId, score: 1, sortOrder: (exam?.examQuestions.length ?? 0) + 1 });
      setShowAddQ(false);
      fetchExam();
    } catch {
      setError('添加题目失败');
    }
  };

  const handleRemoveQuestion = async (questionId: string) => {
    try {
      await api.delete(`/exams/${id}/questions/${questionId}`);
      fetchExam();
    } catch {
      setError('移除题目失败');
    }
  };

  const openAddQuestion = async () => {
    setShowAddQ(true);
    try {
      const r = await api.get('/question-banks');
      setBanks(r.data);
    } catch {
      setError('加载题库失败');
    }
  };

  const loadBankQuestions = async (bankId: string) => {
    setSelectedBank(bankId);
    try {
      const r = await api.get(`/question-banks/${bankId}/questions`, { params: { limit: 200 } });
      setBankQuestions(r.data.data);
    } catch {
      setError('加载题目失败');
    }
  };

  const handleExport = async () => {
    try {
      const res = await api.get(`/exams/${id}/export`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
      const a = document.createElement('a');
      a.href = url; a.download = `exam-${id?.slice(0, 8) ?? 'export'}.csv`; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setError('导出失败');
    }
  };

  if (!exam) return <ProtectedRoute><Layout title="加载中..."><p className="text-gray-400">加载中...</p></Layout></ProtectedRoute>;

  return (
    <ProtectedRoute>
      <Layout title={exam.title}>
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 flex justify-between">
            <span>{error}</span>
            <button onClick={() => setError('')} className="text-red-400 hover:text-red-600">&times;</button>
          </div>
        )}
        <div className="flex justify-between items-center mb-4">
          <div className="flex gap-4 text-sm text-gray-500">
            <span>时长: {exam.timeLimit}分钟</span>
            <span>及格分: {exam.passScore}</span>
            <span>防作弊: {exam.antiCheat ? '开启' : '关闭'}</span>
            <span>状态: {exam.status}</span>
          </div>
          <div className="flex gap-2">
            {exam.status === 'DRAFT' && (
              <button onClick={handlePublish} className="bg-emerald-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors">发布</button>
            )}
            <button onClick={() => router.push('/dashboard/exams')} className="border px-4 py-1.5 rounded text-sm">返回列表</button>
          </div>
        </div>

        {accessCode && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 mb-4 text-sm">
            考试码: <span className="font-mono font-bold text-lg">{accessCode}</span>
          </div>
        )}

        <div className="flex border-b mb-4">
          {(['paper', 'analysis'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm ${tab === t ? 'border-b-2 border-blue-600 text-blue-600 font-medium' : 'text-gray-500'}`}>
              {t === 'paper' ? '试卷' : '成绩分析'}
            </button>
          ))}
        </div>

        {tab === 'paper' && (
          <div>
            <div className="flex justify-end mb-3">
              <button onClick={openAddQuestion} className="bg-brand-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors">添加题目</button>
            </div>
            <div className="bg-white rounded-lg shadow">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="pb-2 px-4 w-12">#</th><th className="pb-2 px-4">题干</th><th className="pb-2 px-4">题型</th><th className="pb-2 px-4">分值</th><th className="pb-2 px-4">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {exam.examQuestions.map((eq, i) => (
                    <tr key={eq.question.id} className="border-b last:border-0">
                      <td className="py-2 px-4 text-gray-400">{i + 1}</td>
                      <td className="py-2 px-4">{eq.question.content}</td>
                      <td className="py-2 px-4 text-gray-500 text-xs">{eq.question.type}</td>
                      <td className="py-2 px-4">{eq.score}</td>
                      <td className="py-2 px-4">
                        <button onClick={() => handleRemoveQuestion(eq.question.id)} className="text-red-500 text-xs hover:underline">移除</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {exam.examQuestions.length === 0 && <p className="text-gray-400 text-center py-8">暂无题目</p>}
            </div>
          </div>
        )}

        {tab === 'analysis' && (
          <div>
            <div className="flex justify-end mb-3">
              <button onClick={handleExport} className="border px-4 py-1.5 rounded text-sm hover:bg-slate-50">导出 CSV</button>
            </div>
            {stats && (
              <div className="grid grid-cols-4 gap-4 mb-6">
                <StatCard label="交卷人数" value={String(stats.submitted)} />
                <StatCard label="平均分" value={String(stats.avg)} />
                <StatCard label="最高分" value={String(stats.max)} />
                <StatCard label="及格率" value={`${stats.passRate}%`} />
              </div>
            )}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h3 className="font-semibold mb-4">题目分析</h3>
              {(analysis as Array<{ questionId: string; content: string; correctRate: number; answerDistribution: Record<string, number> }>).map((a) => (
                <div key={a.questionId} className="border-b last:border-0 py-3">
                  <p className="text-sm mb-2">{a.content}</p>
                  <div className="flex gap-4 text-xs text-gray-500">
                    <span>正确率: {a.correctRate}%</span>
                    {a.answerDistribution && Object.entries(a.answerDistribution).map(([k, v]) => (
                      <span key={k}>{k}: {v as number}人</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-semibold mb-4">成绩列表</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="pb-2">学号</th><th className="pb-2">姓名</th><th className="pb-2">班级</th><th className="pb-2">分数</th><th className="pb-2">是否及格</th>
                  </tr>
                </thead>
                <tbody>
                  {(results as Array<{ id: string; score: number; student: { studentNo: string; name: string; class: string | null } }>).map((r) => (
                    <tr key={r.id} className="border-b last:border-0">
                      <td className="py-2">{r.student?.studentNo}</td>
                      <td className="py-2">{r.student?.name}</td>
                      <td className="py-2">{r.student?.class ?? '-'}</td>
                      <td className="py-2 font-medium">{r.score}</td>
                      <td className="py-2">
                        <span className={`px-2 py-0.5 rounded text-xs ${(r.score ?? 0) >= exam.passScore ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                          {(r.score ?? 0) >= exam.passScore ? '及格' : '不及格'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <Modal open={showAddQ} onClose={() => setShowAddQ(false)} title="添加题目">
          <div className="space-y-3">
            <select value={selectedBank} onChange={(e) => loadBankQuestions(e.target.value)}
              className="w-full border rounded px-3 py-1.5 text-sm">
              <option value="">选择题库</option>
              {banks.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <div className="max-h-60 overflow-y-auto space-y-1">
              {bankQuestions.map((q) => (
                <div key={q.id} className="flex justify-between items-center p-2 hover:bg-slate-50 rounded text-sm"
                  onClick={() => handleAddQuestion(q.id)}>
                  <span className="truncate flex-1">{q.content}</span>
                  <span className="text-blue-600 text-xs cursor-pointer ml-2">添加</span>
                </div>
              ))}
            </div>
          </div>
        </Modal>
      </Layout>
    </ProtectedRoute>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-lg shadow p-4 text-center">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}
