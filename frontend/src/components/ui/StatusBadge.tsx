import { cn } from '@/lib/utils';

const statusConfig: Record<string, { label: string; className: string; dot: string }> = {
  completed:        { label: 'Completed',       className: 'status-completed',   dot: 'bg-emerald-500' },
  in_progress:      { label: 'In Progress',     className: 'status-in-progress', dot: 'bg-amber-500'   },
  not_started:      { label: 'Not Started',     className: 'status-not-started', dot: 'bg-gray-400'    },
  delayed:          { label: 'Delayed',         className: 'status-delayed',     dot: 'bg-red-500'     },
  partial:          { label: 'Partial',         className: 'status-in-progress', dot: 'bg-orange-500'  },
  need_help:        { label: 'Need Help',       className: 'status-need-help',   dot: 'bg-purple-500'  },
  submitted:        { label: 'Submitted',       className: 'status-completed',   dot: 'bg-blue-500'    },
  awaiting_review:  { label: 'Awaiting Review', className: 'status-in-progress', dot: 'bg-blue-400'    },
  approved:         { label: 'Approved',        className: 'status-completed',   dot: 'bg-emerald-600' },
  rejected:         { label: 'Rejected',        className: 'status-delayed',     dot: 'bg-red-600'     },
  active:           { label: 'Active',          className: 'status-completed',   dot: 'bg-emerald-500' },
  inactive:         { label: 'Inactive',        className: 'status-not-started', dot: 'bg-gray-400'    },
};

export function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || { label: status, className: 'status-not-started', dot: 'bg-gray-400' };

  return (
    <span className={config.className}>
      <span className={cn('w-1.5 h-1.5 rounded-full', config.dot)} />
      {config.label}
    </span>
  );
}
