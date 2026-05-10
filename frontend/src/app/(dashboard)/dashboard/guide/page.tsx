'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { motion } from 'framer-motion';
import {
  Users, Target, TrendingUp, AlertCircle, Clock, CheckCircle,
  BookOpen, Video, Brain, Plus, ArrowRight, Activity
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area,
} from 'recharts';
import Link from 'next/link';
import { formatDistanceToNow, format } from 'date-fns';
import { useAuthStore } from '@/store/authStore';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { MetricCard } from '@/components/ui/MetricCard';
import { ProgressRing } from '@/components/ui/ProgressRing';

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#6b7280', '#8b5cf6', '#3b82f6'];

export default function GuideDashboard() {
  const { user } = useAuthStore();

  const { data: overview, isLoading } = useQuery({
    queryKey: ['guide-overview'],
    queryFn: () => apiClient.get('/research/dashboard/guide').then((r) => r.data.data),
    refetchInterval: 60000,
  });

  const { data: analytics } = useQuery({
    queryKey: ['professor-analytics'],
    queryFn: () => apiClient.get('/analytics/professor').then((r) => r.data.data),
  });

  if (isLoading) return <DashboardSkeleton />;

  const scholars = overview?.scholars || [];
  const pendingGoals = overview?.pendingGoals || [];
  const upcomingMeetings = overview?.upcomingMeetings || [];
  const projectStats = overview?.projectStats || [];

  const totalScholars = scholars.length;
  const avgCompletion = scholars.length
    ? Math.round(scholars.reduce((a: number, s: any) => a + (s.completion_percentage || 0), 0) / scholars.length)
    : 0;
  const overdueGoals = pendingGoals.filter((g: any) => new Date(g.due_date) < new Date()).length;

  const goalStatusData = analytics?.goalStats?.map((s: any) => ({
    name: s.status.replace(/_/g, ' '),
    value: parseInt(s.count),
  })) || [];

  const publicationTrend = analytics?.publicationTrend?.map((p: any) => ({
    month: format(new Date(p.month), 'MMM'),
    publications: parseInt(p.count),
  })) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Good {getGreeting()}, Dr. {user?.lastName} 👋
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {format(new Date(), 'EEEE, MMMM d, yyyy')} · Managing {totalScholars} scholars
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/goals/new" className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 transition shadow-lg shadow-primary-500/20">
            <Plus className="w-4 h-4" />
            Assign Goal
          </Link>
          <Link href="/meetings/new" className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition">
            <Video className="w-4 h-4" />
            Schedule Meeting
          </Link>
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Scholars"
          value={totalScholars}
          icon={<Users className="w-5 h-5" />}
          color="blue"
          change="+2 this semester"
          changeType="positive"
        />
        <MetricCard
          title="Avg. Completion"
          value={`${avgCompletion}%`}
          icon={<TrendingUp className="w-5 h-5" />}
          color="green"
          change="+5% vs last month"
          changeType="positive"
        />
        <MetricCard
          title="Overdue Goals"
          value={overdueGoals}
          icon={<AlertCircle className="w-5 h-5" />}
          color="red"
          change="Needs attention"
          changeType={overdueGoals > 0 ? 'negative' : 'positive'}
        />
        <MetricCard
          title="Upcoming Meetings"
          value={upcomingMeetings.length}
          icon={<Clock className="w-5 h-5" />}
          color="purple"
          change="This week"
          changeType="neutral"
        />
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Scholar Progress */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
              <h2 className="font-semibold text-gray-900 dark:text-white">Scholar Progress Overview</h2>
              <Link href="/scholars" className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="p-4 space-y-3">
              {scholars.slice(0, 6).map((scholar: any) => (
                <ScholarProgressRow key={scholar.id} scholar={scholar} />
              ))}
              {scholars.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  <Users className="w-12 h-12 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">No research scholars yet</p>
                  <Link href="/scholars/add" className="text-primary-600 text-sm font-medium mt-1 inline-block">Add Scholar →</Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Goal status donut */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Goal Status</h2>
            {goalStatusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={goalStatusData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value">
                    {goalStatusData.map((_: any, i: number) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: any) => [`${v} goals`]} />
                  <Legend iconType="circle" iconSize={8} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-44 flex items-center justify-center text-gray-400 text-sm">No goal data yet</div>
            )}
          </div>

          {/* Upcoming meetings */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900 dark:text-white">Upcoming Meetings</h2>
              <Link href="/meetings" className="text-xs text-primary-600 font-medium">View all</Link>
            </div>
            <div className="space-y-3">
              {upcomingMeetings.slice(0, 3).map((meeting: any) => (
                <div key={meeting.id} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                  <div className="w-9 h-9 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Video className="w-4 h-4 text-primary-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{meeting.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {format(new Date(meeting.scheduled_at), 'MMM d, h:mm a')}
                    </p>
                    <p className="text-xs text-gray-400">{meeting.participant_count} participants</p>
                  </div>
                </div>
              ))}
              {upcomingMeetings.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">No upcoming meetings</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Publication trend */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Publication Trend (12 months)</h2>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={publicationTrend}>
              <defs>
                <linearGradient id="pubGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Area type="monotone" dataKey="publications" stroke="#3b82f6" fill="url(#pubGradient)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Pending & Overdue Goals */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
          <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
            <h2 className="font-semibold text-gray-900 dark:text-white">Attention Required</h2>
            <Link href="/goals?status=overdue" className="text-xs text-red-500 font-medium">View overdue →</Link>
          </div>
          <div className="p-4 space-y-2.5 max-h-52 overflow-y-auto">
            {pendingGoals.slice(0, 6).map((goal: any) => (
              <div key={goal.id} className="flex items-center gap-3 p-3 border border-red-100 dark:border-red-900/30 bg-red-50/50 dark:bg-red-900/10 rounded-xl">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{goal.title}</p>
                  <p className="text-xs text-gray-500">{goal.scholar_name}</p>
                </div>
                <span className="text-xs text-red-500 font-medium flex-shrink-0">
                  {formatDistanceToNow(new Date(goal.due_date), { addSuffix: true })}
                </span>
              </div>
            ))}
            {pendingGoals.length === 0 && (
              <div className="text-center py-6">
                <CheckCircle className="w-10 h-10 mx-auto text-emerald-400 mb-2" />
                <p className="text-sm text-gray-500">All goals are on track!</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      {analytics?.recentActivity?.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-primary-600" />
            <h2 className="font-semibold text-gray-900 dark:text-white">Recent Scholar Activity</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {analytics.recentActivity.slice(0, 6).map((act: any, i: number) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <div className="w-2 h-2 mt-2 rounded-full bg-primary-400 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gray-900 dark:text-white">{act.scholar_name}</p>
                  <p className="text-xs text-gray-500 truncate">{act.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{formatDistanceToNow(new Date(act.created_at), { addSuffix: true })}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ScholarProgressRow({ scholar }: { scholar: any }) {
  const completion = scholar.completion_percentage || 0;
  const isAtRisk = completion < 30 && scholar.expected_end_date && new Date(scholar.expected_end_date) < new Date(Date.now() + 90 * 24 * 3600 * 1000);

  return (
    <Link href={`/scholars/${scholar.id}`}>
      <div className={`flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition cursor-pointer ${isAtRisk ? 'border border-red-100 dark:border-red-900/30 bg-red-50/30 dark:bg-red-900/5' : ''}`}>
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
          {scholar.first_name?.[0]}{scholar.last_name?.[0]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-medium text-gray-900 dark:text-white">{scholar.first_name} {scholar.last_name}</p>
            <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">{completion}%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  completion >= 70 ? 'bg-emerald-500' :
                  completion >= 40 ? 'bg-amber-500' : 'bg-red-500'
                }`}
                style={{ width: `${completion}%` }}
              />
            </div>
            <span className="text-xs text-gray-400 capitalize flex-shrink-0">{scholar.type}</span>
          </div>
        </div>
        {isAtRisk && <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />}
      </div>
    </Link>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-64" />
      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-gray-200 dark:bg-gray-700 rounded-2xl" />)}
      </div>
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 h-64 bg-gray-200 dark:bg-gray-700 rounded-2xl" />
        <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-2xl" />
      </div>
    </div>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}
