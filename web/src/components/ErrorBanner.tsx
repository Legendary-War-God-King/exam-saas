import { memo } from 'react';

export interface ErrorBannerProps {
  error: string;
  onDismiss?: () => void;
}

function ErrorBannerInner({ error, onDismiss }: ErrorBannerProps) {
  if (!error) return null;
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 flex justify-between items-center"
    >
      <span>{error}</span>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="关闭错误提示"
          className="text-red-400 hover:text-red-600 transition-colors text-lg leading-none"
        >
          &times;
        </button>
      )}
    </div>
  );
}

export const ErrorBanner = memo(ErrorBannerInner);

export default ErrorBanner;
