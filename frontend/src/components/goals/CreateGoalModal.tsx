'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiClient } from '@/lib/api';
import { X, Plus, Trash2, Target, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

const goalSchema = z.object({
  assignedTo: z.string().min(1, 'Please select a scholar'),
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().optional(),
  category: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical', 'urgent']).default('medium'),
  dueDate: z.string().optional(),
  startDate: z.string().optional(),
  milestones: z.array(z.object({ title: z.string(), dueDate: z.string().optional() })).optional(),
  isRecurring: z.boolean().default(false),
  reminderDays: z.string().optional(),
});

type GoalForm = z.infer<typeof goalSchema>;

export function CreateGoalModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);

  const { data: scholars } = useQuery({
    queryKey: ['scholars-search', searchQuery],
    queryFn: () => apiClient.get('/users/search', { params: { q: searchQuery || 'a', role: 'phd_scholar' } }).then((r) => r.data.data),
  });

  const { register, handleSubmit, control, setValue, watch, formState: { errors } } = useForm<GoalForm>({
    resolver: zodResolver(goalSchema),
    defaultValues: { priority: 'medium', milestones: [], isRecurring: false },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'milestones' });

  const createMutation = useMutation({
    mutationFn: (data: GoalForm) => apiClient.post('/goals', {
      ...data,
      reminderDays: data.reminderDays ? data.reminderDays.split(',').map(Number) : [1, 3, 7],
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      toast.success('Goal assigned successfully');
      onClose();
    },
    onError: () => toast.error('Failed to create goal'),
  });

  const generateAIMilestones = async () => {
    const title = watch('title');
    if (!title) { toast.error('Enter a goal title first'); return; }

    setAiGenerating(true);
    try {
      const res = await apiClient.post('/ai/assistant', {
        message: `For a PhD research goal titled "${title}", generate 4-5 specific milestone steps with brief descriptions. Return only a JSON array: [{"title": "...", "description": "..."}]`,
      });

      const content = res.data.data.response;
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const milestones = JSON.parse(jsonMatch[0]);
        setValue('milestones', milestones.slice(0, 5));
        toast.success('AI milestones generated');
      }
    } catch {
      toast.error('AI generation failed');
    } finally {
      setAiGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center">
              <Target className="w-5 h-5 text-primary-600" />
            </div>
            <h2 className="font-bold text-gray-900 dark:text-white text-lg">Assign New Goal</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="p-6 space-y-5">
          {/* Scholar selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Assign To *</label>
            <select {...register('assignedTo')} className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500">
              <option value="">Select Scholar</option>
              {scholars?.map((s: any) => (
                <option key={s.id} value={s.id}>{s.first_name} {s.last_name} — {s.email}</option>
              ))}
            </select>
            {errors.assignedTo && <p className="text-red-500 text-xs mt-1">{errors.assignedTo.message}</p>}
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Goal Title *</label>
            <input {...register('title')} placeholder="e.g., Complete Literature Review" className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500" />
            {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Description</label>
            <textarea {...register('description')} rows={2} placeholder="Detailed description of the goal..." className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none" />
          </div>

          {/* Priority & Dates */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Priority</label>
              <select {...register('priority')} className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Start Date</label>
              <input {...register('startDate')} type="date" className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Due Date</label>
              <input {...register('dueDate')} type="date" className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
          </div>

          {/* Milestones */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Milestones / Sub-tasks</label>
              <div className="flex gap-2">
                <button type="button" onClick={generateAIMilestones} disabled={aiGenerating} className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 rounded-lg text-xs font-medium hover:bg-purple-100 transition disabled:opacity-60">
                  <Sparkles className="w-3.5 h-3.5" />
                  {aiGenerating ? 'Generating...' : 'AI Generate'}
                </button>
                <button type="button" onClick={() => append({ title: '', dueDate: '' })} className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-medium hover:bg-gray-200 transition">
                  <Plus className="w-3.5 h-3.5" />
                  Add
                </button>
              </div>
            </div>
            <div className="space-y-2">
              {fields.map((field, i) => (
                <div key={field.id} className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 w-5 text-center">{i + 1}.</span>
                  <input {...register(`milestones.${i}.title`)} placeholder="Milestone title" className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500" />
                  <input {...register(`milestones.${i}.dueDate`)} type="date" className="w-36 px-2 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-xs bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none" />
                  <button type="button" onClick={() => remove(i)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Reminder */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Reminder Days (comma-separated, e.g., 1,3,7)
            </label>
            <input {...register('reminderDays')} placeholder="1,3,7" className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>

          {/* Footer */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition">
              Cancel
            </button>
            <button type="submit" disabled={createMutation.isPending} className="flex-1 px-4 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 transition disabled:opacity-60">
              {createMutation.isPending ? 'Assigning...' : 'Assign Goal'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
