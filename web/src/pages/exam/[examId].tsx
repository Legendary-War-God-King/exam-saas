import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import studentApi from '@/lib/student-api';

interface Question {
  id: string; type: string; content: string; options: Record<string, string> | null;
  difficulty: number; sortOrder: number; score: number;
}

export default function ExamPage() {
  const router = useRouter();
  const { examId } = router.query as { examId: string };
  const [questions, setQuestions] = useState<Question[]>([]);
  const [recordId, setRecordId] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const submitExam = useCallback(async (rid: string) => {
    if (submitting || submitted) return; // 多 tab + 倒计时归零并发守卫
    setSubmitting(true);
    try {
      await studentApi.post(`/student/exams/${examId}/submit`, { recordId: rid });
      setSubmitted(true);
    } catch {
      setSubmitting(false); // 失败才解锁（成功保持锁定直到 unmount）
    }
  }, [examId, submitting, submitted]);

  useEffect(() => {
    if (!examId) return;
    studentApi.get(`/student/exams/${examId}/questions`)
      .then((r) => {
        setQuestions(r.data.questions);
        setRecordId(r.data.recordId);
        setSecondsLeft(r.data.timeLimit * 60);
        setLoading(false);
      })
      .catch(() => setError('加载考试失败'));
  }, [examId]);

  // Timer
  useEffect(() => {
    if (secondsLeft <= 0 || submitted || !recordId) return;
    const t = setInterval(() => {
      setSecondsLeft((p) => {
        if (p <= 1) { void submitExam(recordId); return 0; }
        return p - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [secondsLeft, submitted, recordId, submitExam]);

  const chooseAnswer = async (qid: string, answer: string) => {
    setAnswers((p) => ({ ...p, [qid]: answer }));
    try {
      await studentApi.post(`/student/exams/${examId}/answer`, {
        recordId, questionId: qid, selectedAnswer: answer, timeSpent: 0,
      });
    } catch { /* continue */ }
  };

  const handleSubmit = async () => {
    if (submitting || submitted) return;
    if (!confirm('确认交卷？交卷后不可修改。')) return;
    setSubmitting(true);
    try {
      await studentApi.post(`/student/exams/${examId}/submit`, { recordId });
      setSubmitted(true);
      router.push(`/exam/${examId}/result?recordId=${recordId}`);
    } catch {
      setSubmitting(false);
      setError('交卷失败，请重试');
    }
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, '0')}`;
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><p className="text-slate-400">加载中...</p></div>;
  if (submitted) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><p className="text-slate-400">考试已提交</p></div>;

  const q = questions[currentIdx];
  const answeredCount = Object.keys(answers).length;

  return (
    <>
      <Head><title>考试中</title></Head>
      <div className="min-h-screen bg-slate-50">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between z-10">
          <span className="text-sm text-slate-500">{currentIdx + 1}/{questions.length}</span>
          <span className={`font-mono font-bold text-sm ${secondsLeft < 300 ? 'text-red-500' : 'text-slate-700'}`}>
            {formatTime(secondsLeft)}
          </span>
          <span className="text-xs text-slate-400">已答 {answeredCount}</span>
        </div>

        {error && <div className="mx-4 mt-3 p-2 bg-red-50 text-red-500 text-xs rounded-lg">{error}</div>}

        {/* Question */}
        {q && (
          <div className="px-4 py-6">
            <div className="bg-white rounded-xl shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xs font-medium text-brand-600 bg-brand-50 px-2 py-0.5 rounded">
                  {q.type === 'SINGLE_CHOICE' ? '单选' : q.type === 'TRUE_FALSE' ? '判断' : q.type}
                </span>
                <span className="text-xs text-slate-400">{q.score} 分</span>
              </div>
              <p className="text-slate-800 text-lg mb-6">{q.content}</p>

              <div className="space-y-2">
                {q.options
                  ? Object.entries(q.options).map(([k, v]) => (
                      <button
                        key={k}
                        onClick={() => chooseAnswer(q.id, k)}
                        className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-colors ${
                          answers[q.id] === k
                            ? 'border-brand-500 bg-brand-50 text-brand-700 font-medium'
                            : 'border-slate-200 hover:border-slate-300 text-slate-600'
                        }`}
                      >
                        <span className="font-mono text-brand-500 mr-2">{k}.</span>
                        {v}
                      </button>
                    ))
                  : q.type === 'TRUE_FALSE' ? (
                    <div className="grid grid-cols-2 gap-3">
                      {['正确', '错误'].map((label) => (
                        <button
                          key={label}
                          onClick={() => chooseAnswer(q.id, label)}
                          className={`py-4 rounded-xl border text-lg font-medium transition-colors ${
                            answers[q.id] === label
                              ? 'border-brand-500 bg-brand-50 text-brand-700'
                              : 'border-slate-200 hover:border-slate-300 text-slate-500'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={answers[q.id] ?? ''}
                      onChange={(e) => chooseAnswer(q.id, e.target.value)}
                      placeholder="输入答案"
                      className="w-full border border-slate-200 rounded-lg px-3.5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                    />
                  )}
              </div>
            </div>
          </div>
        )}

        {/* Bottom nav */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 py-3">
          <div className="flex gap-2 max-w-lg mx-auto">
            <button
              onClick={() => setCurrentIdx((p) => Math.max(0, p - 1))}
              disabled={currentIdx === 0}
              className="flex-1 py-3 border border-slate-200 rounded-xl text-sm disabled:opacity-30"
            >
              上一题
            </button>
            {currentIdx < questions.length - 1 ? (
              <button
                onClick={() => setCurrentIdx((p) => p + 1)}
                className="flex-1 py-3 bg-brand-600 text-white rounded-xl text-sm font-medium"
              >
                下一题
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                className="flex-1 py-3 bg-red-500 text-white rounded-xl text-sm font-medium"
              >
                交卷
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
