import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import studentApi from '@/lib/student-api';

export default function ExamLoginPage() {
  const router = useRouter();
  const [studentNo, setStudentNo] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!studentNo.trim() || !code.trim()) {
      setError('请输入学号和考试码');
      return;
    }
    setLoading(true);
    try {
      const res = await studentApi.post('/student/auth', {
        studentNo: studentNo.trim(),
        code: code.trim(),
        tenantId: 'ebe1b466-4265-46a8-a221-dfb743032a74', // hardcoded — V2 add tenant discovery
      });
      sessionStorage.setItem('studentToken', res.data.token);
      sessionStorage.setItem('studentName', res.data.student.name);
      router.push(`/exam/${res.data.examId}`);
    } catch {
      setError('学号或考试码无效');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head><title>进入考试</title></Head>
      <div className="min-h-screen bg-gradient-to-b from-brand-600 to-brand-700 flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Exam SaaS</h1>
            <p className="text-brand-200 text-sm">在线考试平台</p>
          </div>

          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl p-6 space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">学号 / 准考证号</label>
              <input
                type="text" value={studentNo} onChange={(e) => setStudentNo(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3.5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                placeholder="输入学号" autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">考试码</label>
              <input
                type="text" value={code} onChange={(e) => setCode(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3.5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                placeholder="6 位数字" maxLength={6}
              />
            </div>
            {error && <p className="text-red-500 text-xs bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            <button
              type="submit" disabled={loading}
              className="w-full bg-brand-600 hover:bg-brand-700 text-white py-3 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
            >
              {loading ? '验证中...' : '进入考试'}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
