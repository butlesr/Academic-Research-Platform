'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { X, Target, Calendar, Flag, User, CheckCircle, AlertCircle, Paperclip, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { StatusBadge } from '@/components/ui/StatusBadge';

const STATUS_OPTIONS = [
  { value: 'not_started', label: 'Not Started', color: 'bg-gray-100 text-gray-700' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-amber-100 text-amber-700' },
  { value: 'partial', label: 'Partial', color: 'bg-orange-100 text-orange-700' },
  { value: 'need_help', label: 'Need Help', color: 'bg-purple-100 text-purple-700' },
  { value: 'submitted', label: 'Submitted', color: 'bg-blue-100 text-blue-700' },
  { value: 'completed', label: 'Completed', color: 'bg-emerald-100 text-emerald-700' },
];

export function GoalDetailModal({ goal, onClose, isGuide }: { goal: any; onClose: () => void; isGuide: boolean }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState(goal.status);
  const [completion, setCompletion] = useState(goal.completion_percentage || 0);
  const [remarks, setRemarks] = useState('');

  const updateMutation = useMutation({
    mutationFn: () => apiClient.patch(`/goals/${goal.id}/status`, { status, completionPercentage: completion, remarks }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      toast.success('Goal updated');
      onClose();
    },
    onError: () => toast.error('Failed to update goal'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center">
              <Target className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 dark:text-white text-lg leading-tight">{goal.title}</h2>
              <div className="flex items-center gap-2 mt-1">
                <StatusBadge status={goal.status} />
                <span className="text-xs text-gray-400 capitalize">{goal.priority} priority</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Meta info */}
          <div className="grid grid-cols-2 gap-4">
            {goal.assigned_to_name && (
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-400">Assigned To</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{goal.assigned_to_name}</p>
                </div>
              </div>
            )}
            {goal.due_date && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-400">Due Date</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{format(new Date(goal.due_date), 'MMM d, yyyy')}</p>
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          {goal.description && (
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Description</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-3 rounded-xl">{goal.description}</p>
            </div>
          )}

          {/* Progress slider */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Completion Progress</p>
              <span className="text-sm font-bold text-primary-600">{completion}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={completion}
              onChange={(e) => setCompletion(parseInt(e.target.value))}
              disabled={isGuide}
              className="w-full accent-primary-600"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-0.5">
              <span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span>
            </div>
          </div>

          {/* Status update (for students) */}
          {!isGuide && (
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Update Status</p>
              <div className="grid grid-cols-3 gap-2">
                {STATUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setStatus(opt.value)}
                    className={`px-3 py-2 text-xs font-medium rounded-xl border-2 transition ${
                      status === opt.value ? 'border-primary-500 ' + opt.color : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Remarks */}
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              {isGuide ? 'Guide Remarks' : 'Add Remark'}
            </p>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder={isGuide ? 'Add your feedback or remarks...' : 'Update your progress or add remarks...'}
              rows={3}
              className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-white resize-none"
            />
          </div>

          {/* Milestones preview */}
          {goal.milestones?.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Milestones</p>
              <div className="space-y-2">
                {goal.milestones.map((m: any) => (
                  <div key={m.id} className="flex items-center gap-3 p-2.5 bg-gray-50 dark:bg-gray-800 rounded-xl">
                    {m.status === 'completed'
                      ? <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      : <AlertCircle className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                    <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">{m.title}</span>
                    <StatusBadge status={m.status} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-gray-100 dark:border-gray-800">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition">
            Cancel
          </button>
          <button
            onClick={() => updateMutation.mutate()}
            disabled={updateMutation.isPending}
            className="flex-1 px-4 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 transition disabled:opacity-60"
          >
            {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
