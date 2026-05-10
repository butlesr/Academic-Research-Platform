'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { format, isPast, isToday } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Target, Filter, Search, ChevronDown, Calendar,
  AlertCircle, CheckCircle, Clock, Flag, Paperclip, MessageSquare,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { GoalDetailModal } from '@/components/goals/GoalDetailModal';
import { CreateGoalModal } from '@/components/goals/CreateGoalModal';

const STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'not_started', label: 'Not Started' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'delayed', label: 'Delayed' },
  { value: 'need_help', label: 'Need Help' },
  { value: 'submitted', label: 'Submitted' },
];

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'text-red-500',
  urgent: 'text-orange-500',
  high: 'text-amber-500',
  medium: 'text-blue-500',
  low: 'text-gray-400',
};

export default function GoalsPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [search, setSearch] = useState('');
  const [selectedGoal, setSelectedGoal] = useState<any>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const isGuide = ['professor', 'super_admin', 'admin'].includes(user?.role || '');

  const { data, isLoading } = useQuery({
    queryKey: ['goals', statusFilter, priorityFilter],
    queryFn: () => apiClient.get('/goals', {
      params: { status: statusFilter || undefined, priority: priorityFilter || undefined, limit: 50 },
    }).then((r) => r.data),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status, completionPercentage, remarks }: any) =>
      apiClient.patch(`/goals/${id}/status`, { status, completionPercentage, remarks }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      toast.success('Goal status updated');
    },
    onError: () => toast.error('Failed to update goal'),
  });

  const goals = data?.data || [];
  const filtered = goals.filter((g: any) =>
    !search || g.title.toLowerCase().includes(search.toLowerCase()) ||
    g.assigned_to_name?.toLowerCase().includes(search.toLowerCase())
  );

  const groupedGoals = {
    overdue: filtered.filter((g: any) => !['completed', 'approved'].includes(g.status) && g.due_date && isPast(new Date(g.due_date)) && !isToday(new Date(g.due_date))),
    today: filtered.filter((g: any) => g.due_date && isToday(new Date(g.due_date)) && !['completed', 'approved'].includes(g.status)),
    upcoming: filtered.filter((g: any) => !g.due_date || (!isPast(new Date(g.due_date)) && !isToday(new Date(g.due_date)))),
    completed: filtered.filter((g: any) => ['completed', 'approved'].includes(g.status)),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Target className="w-6 h-6 text-primary-600" />
            Goals & Milestones
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">{goals.length} total goals</p>
        </div>
        {isGuide && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 transition shadow-lg shadow-primary-500/20"
          >
            <Plus className="w-4 h-4" />
            Assign Goal
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search goals..."
            className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-700 dark:text-gray-300"
        >
          {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-700 dark:text-gray-300"
        >
          <option value="">All Priority</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Overdue', count: groupedGoals.overdue.length, color: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400' },
          { label: 'Due Today', count: groupedGoals.today.length, color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400' },
          { label: 'Upcoming', count: groupedGoals.upcoming.length, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' },
          { label: 'Completed', count: groupedGoals.completed.length, color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' },
        ].map((stat) => (
          <div key={stat.label} className={`${stat.color} rounded-xl p-3 text-center`}>
            <p className="text-2xl font-bold">{stat.count}</p>
            <p className="text-xs font-medium mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Goal groups */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {groupedGoals.overdue.length > 0 && (
            <GoalGroup title="⚠️ Overdue" goals={groupedGoals.overdue} accent="red" onSelect={setSelectedGoal} onStatusUpdate={updateStatusMutation.mutate} isGuide={isGuide} />
          )}
          {groupedGoals.today.length > 0 && (
            <GoalGroup title="📅 Due Today" goals={groupedGoals.today} accent="amber" onSelect={setSelectedGoal} onStatusUpdate={updateStatusMutation.mutate} isGuide={isGuide} />
          )}
          {groupedGoals.upcoming.length > 0 && (
            <GoalGroup title="📌 Upcoming" goals={groupedGoals.upcoming} accent="blue" onSelect={setSelectedGoal} onStatusUpdate={updateStatusMutation.mutate} isGuide={isGuide} />
          )}
          {groupedGoals.completed.length > 0 && (
            <GoalGroup title="✅ Completed" goals={groupedGoals.completed} accent="green" onSelect={setSelectedGoal} onStatusUpdate={updateStatusMutation.mutate} isGuide={isGuide} />
          )}
          {filtered.length === 0 && (
            <div className="text-center py-16">
              <Target className="w-16 h-16 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">No goals found</p>
              {isGuide && (
                <button onClick={() => setShowCreateModal(true)} className="mt-3 text-primary-600 text-sm font-medium">
                  Assign your first goal →
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {selectedGoal && <GoalDetailModal goal={selectedGoal} onClose={() => setSelectedGoal(null)} isGuide={isGuide} />}
      {showCreateModal && <CreateGoalModal onClose={() => setShowCreateModal(false)} />}
    </div>
  );
}

function GoalGroup({ title, goals, accent, onSelect, onStatusUpdate, isGuide }: any) {
  const [expanded, setExpanded] = useState(true);
  const accentColors: Record<string, string> = {
    red: 'border-red-200 dark:border-red-900/30',
    amber: 'border-amber-200 dark:border-amber-900/30',
    blue: 'border-blue-200 dark:border-blue-900/30',
    green: 'border-emerald-200 dark:border-emerald-900/30',
  };

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300"
      >
        <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? '' : '-rotate-90'}`} />
        {title} <span className="text-gray-400 font-normal">({goals.length})</span>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2 overflow-hidden"
          >
            {goals.map((goal: any) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                accentClass={accentColors[accent]}
                onSelect={onSelect}
                onStatusUpdate={onStatusUpdate}
                isGuide={isGuide}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function GoalCard({ goal, accentClass, onSelect, onStatusUpdate, isGuide }: any) {
  return (
    <div
      className={`bg-white dark:bg-gray-900 border ${accentClass} rounded-2xl p-4 hover:shadow-md transition-all cursor-pointer`}
      onClick={() => onSelect(goal)}
    >
      <div className="flex items-start gap-3">
        {/* Priority indicator */}
        <Flag className={`w-4 h-4 mt-0.5 flex-shrink-0 ${PRIORITY_COLORS[goal.priority] || 'text-gray-400'}`} />

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="font-medium text-gray-900 dark:text-white text-sm">{goal.title}</p>
            <StatusBadge status={goal.status} />
          </div>

          {isGuide && goal.assigned_to_name && (
            <p className="text-xs text-gray-500 mt-0.5">Assigned to: {goal.assigned_to_name}</p>
          )}

          {/* Progress bar */}
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  goal.completion_percentage >= 100 ? 'bg-emerald-500' :
                  goal.completion_percentage >= 50 ? 'bg-amber-500' : 'bg-red-400'
                }`}
                style={{ width: `${goal.completion_percentage || 0}%` }}
              />
            </div>
            <span className="text-xs text-gray-500 flex-shrink-0">{goal.completion_percentage || 0}%</span>
          </div>

          <div className="flex items-center gap-4 mt-2">
            {goal.due_date && (
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <Calendar className="w-3 h-3" />
                {format(new Date(goal.due_date), 'MMM d, yyyy')}
              </span>
            )}
            {goal.milestone_count > 0 && (
              <span className="text-xs text-gray-400">
                {goal.completed_milestones}/{goal.milestone_count} milestones
              </span>
            )}
            {goal.attachments?.length > 0 && (
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <Paperclip className="w-3 h-3" />
                {goal.attachments.length}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Quick status update for students */}
      {!isGuide && goal.status !== 'completed' && (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
          {[
            { value: 'in_progress', label: 'Start', color: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' },
            { value: 'need_help', label: 'Need Help', color: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100' },
            { value: 'submitted', label: 'Submit', color: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100' },
            { value: 'completed', label: 'Done ✓', color: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' },
          ].map((action) => (
            goal.status !== action.value && (
              <button
                key={action.value}
                onClick={() => onStatusUpdate({ id: goal.id, status: action.value })}
                className={`px-3 py-1 text-xs font-medium rounded-lg border transition ${action.color} dark:bg-opacity-20 dark:border-opacity-30`}
              >
                {action.label}
              </button>
            )
          ))}
        </div>
      )}
    </div>
  );
}

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'text-red-500',
  urgent: 'text-orange-500',
  high: 'text-amber-500',
  medium: 'text-blue-500',
  low: 'text-gray-400',
};
