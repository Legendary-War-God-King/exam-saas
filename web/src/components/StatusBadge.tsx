import { memo } from 'react';

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  // Exam status
  DRAFT: { label: '草稿', cls: 'bg-slate-100 text-slate-500' },
  PUBLISHED: { label: '已发布', cls: 'bg-emerald-50 text-emerald-700' },
  IN_PROGRESS: { label: '进行中', cls: 'bg-brand-50 text-brand-700' },
  FINISHED: { label: '已结束', cls: 'bg-amber-50 text-amber-700' },
  // User status
  ACTIVE: { label: '正常', cls: 'bg-emerald-50 text-emerald-600' },
  DISABLED: { label: '已禁用', cls: 'bg-red-50 text-red-600' },
  // Record status
  SUBMITTED: { label: '已交卷', cls: 'bg-emerald-50 text-emerald-700' },
  CANCELLED: { label: '已取消', cls: 'bg-slate-100 text-slate-500' },
};

export interface StatusBadgeProps {
  status: string;
  className?: string;
}

function StatusBadgeInner({ status, className = '' }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? { label: status, cls: 'bg-slate-50 text-slate-400' };
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-md text-xs font-medium ${config.cls} ${className}`}
    >
      {config.label}
    </span>
  );
}

export const StatusBadge = memo(StatusBadgeInner);

export default StatusBadge;
