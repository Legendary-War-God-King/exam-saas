import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import studentApi from '@/lib/student-api';

export default function ExamResultPage() {
  const router = useRouter();
  const { examId, recordId } = router.query as { examId: string; recordId: string };
  const [result, setResult] = useState<{ score: number; status: string; exam: { title: string; passScore: number } } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!recordId) return;
    studentApi.get(`/student/exams/${examId}/result`, {
      data: { recordId },
    }).then((r) => {
      setResult(r.data);
      setLoading(false);
    }).catch(() => {
      // GET with body not supported — try POST-style approach
      studentApi.post(`/student/exams/${examId}/submit`, { recordId })
        .then((r2) => { setResult(r2.data); setLoading(false); })
        .catch(() => setLoading(false));
    });
  }, [recordId, examId]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50"><p className="text-slate-400">加载中...</p></div>;
  }

  const passed = result && result.score >= result.exam.passScore;

  return (
    <>
      <Head><title>考试成绩</title></Head>
      <div className="min-h-screen bg-gradient-to-b from-brand-600 to-brand-700 flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm text-center">
          {result ? (
            <>
              <div className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-6 ${
                passed ? 'bg-emerald-400' : 'bg-red-400'
              }`}>
                <span className="text-4xl">{passed ? '✓' : '✗'}</span>
              </div>
              <h1 className="text-white text-2xl font-bold mb-1">{result.exam.title}</h1>
              <p className="text-brand-200 text-sm mb-8">考试完成</p>

              <div className="bg-white rounded-2xl shadow-xl p-6 space-y-4">
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">得分</p>
                  <p className={`text-4xl font-bold font-mono ${passed ? 'text-emerald-600' : 'text-red-500'}`}>
                    {result.score}
                  </p>
                </div>
                <div className="flex justify-between text-sm border-t border-slate-100 pt-4">
                  <span className="text-slate-400">及格线</span>
                  <span className="text-slate-700 font-medium">{result.exam.passScore} 分</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">状态</span>
                  <span className={`font-medium ${passed ? 'text-emerald-600' : 'text-red-500'}`}>
                    {passed ? '通过' : '未通过'}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <p className="text-white">暂无成绩数据</p>
          )}

          <button
            onClick={() => { sessionStorage.clear(); router.push('/exam'); }}
            className="mt-8 text-brand-200 text-sm hover:text-white transition-colors"
          >
            退出考试
          </button>
        </div>
      </div>
    </>
  );
}
