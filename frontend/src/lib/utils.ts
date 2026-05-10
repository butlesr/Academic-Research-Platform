import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function getInitials(firstName: string, lastName: string): string {
  return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
}

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    completed: '#10b981',
    in_progress: '#f59e0b',
    delayed: '#ef4444',
    not_started: '#6b7280',
    need_help: '#8b5cf6',
    submitted: '#3b82f6',
  };
  return map[status] || '#6b7280';
}

export function truncate(str: string, n: number): string {
  return str?.length > n ? str.substring(0, n) + '...' : str;
}

export function debounce<T extends (...args: any[]) => any>(func: T, wait: number) {
  let timeout: ReturnType<typeof setTimeout>;
  return function (...args: Parameters<T>) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}
