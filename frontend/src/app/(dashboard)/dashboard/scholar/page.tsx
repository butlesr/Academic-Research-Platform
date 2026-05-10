'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import {
  Target, BookOpen, Calendar, Award, TrendingUp, Clock,
  CheckCircle, AlertCircle, FileText, Brain, ArrowRight, Star,
} from 'lucide-react';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { MetricCard } from '@/components/ui/MetricCard';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { StatusBadge } from '@/components/ui/StatusBadge';
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';

export default function ScholarDashboard() {
  const { user } = useAuthStore();

  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['scholar-dashboard'],
    queryFn: () => apiClient.get('/research/dashboard/scholar').then((r) => r.data.data),
  });

  const { data: analytics } = useQuery({
    queryKey: ['student-analytics'],
    queryFn: () => apiClient.get('/analytics/student').then((r) => r.data.data),
  });

  if (isLoading) return <ScholarSkeleton />;

  const projects = dashboard?.projects || [];
  const goals = dashboard?.goals || {};
  const attendance = dashboard?.attendance || {};
  const recentActivity = dashboard?.recentActivity || [];
  const mainProject = projects[0];
  const goalCompletionRate = goals.total > 0
    ? Math.round((goals.completed / goals.total) * 100) : 0;

  const radarData = [
    { subject: 'Goals', value: goalCompletionRate },
    { subject: 'Attendance', value: attendance.rate || 0 },
    { subject: 'Assignments', value: analytics?.submissions?.length > 0 ? 75 : 0 },
    { subject: 'Research', value: mainProject?.completion_percentage || 0 },
    { subject: 'Publications', value: Math.min((dashboard?.publications || 0) * 20, 100) },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="bg-gradient-to-r from-primary-600 via-primary-700 to-academic-blue rounded-2xl p-6 text-white">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">Hello, {user?.firstName}! 👋</h1>
            <p className="text-primary-200 mt-1 text-sm">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
            {mainProject && (
              <div className="mt-4">
                <p className="text-primary-200 text-xs uppercase tracking-wider font-medium">Current Research</p>
                <p className="font-semibold mt-0.5 text-lg leading-tight line-clamp-2">{mainProject.title}</p>
                <div className="flex items-center gap-3 mt-2">
                  <div className="flex-1 h-2 bg-primary-500/50 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white rounded-full transition-all"
                      style={{ width: `${mainProject.completion_percentage}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold">{mainProject.completion_percentage}%</span>
                </div>
              </div>
            )}
          </div>
          {mainProject && (
            <ProgressRing value={mainProject.completion_percentage || 0} size={72} strokeWidth={6} color="#ffffff" />
          )}
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Goals Completed"
          value={`${goals.completed || 0}/${goals.total || 0}`}
          icon={<Target className="w-5 h-5" />}
          color="green"
          change={`${goalCompletionRate}% rate`}
          changeType={goalCompletionRate >= 70 ? 'positive' : goalCompletionRate >= 40 ? 'neutral' : 'negative'}
        />
        <MetricCard
          title="Attendance"
          value={`${attendance.rate || 0}%`}
          icon={<Calendar className="w-5 h-5" />}
          color={attendance.rate >= 75 ? 'green' : 'red'}
          change={`${attendance.present || 0}/${attendance.total_classes || 0} classes`}
          changeType={attendance.rate >= 75 ? 'positive' : 'negative'}
        />
        <MetricCard
          title="Overdue Goals"
          value={goals.overdue || 0}
          icon={<AlertCircle className="w-5 h-5" />}
          color="red"
          change={goals.overdue > 0 ? 'Action needed' : 'All on track'}
          changeType={goals.overdue > 0 ? 'negative' : 'positive'}
        />
        <MetricCard
          title="Publications"
          value={dashboard?.publications || 0}
          icon={<FileText className="w-5 h-5" />}
          color="purple"
          change="Total papers"
          changeType="neutral"
        />
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Performance radar */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Performance Overview</h2>
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#e5e7eb" />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
              <Radar name="You" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.25} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Research projects */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 dark:text-white">My Research</h2>
            <Link href="/research" className="text-xs text-primary-600 font-medium">View all →</Link>
          </div>
          <div className="space-y-3">
            {projects.slice(0, 3).map((project: any) => (
              <Link key={project.id} href={`/research/${project.id}`}>
                <div className="p-3 border border-gray-100 dark:border-gray-800 rounded-xl hover:border-primary-200 dark:hover:border-primary-800 transition cursor-pointer">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2">{project.title}</p>
                    <StatusBadge status={project.status} />
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full">
                      <div className="h-full bg-primary-500 rounded-full" style={{ width: `${project.completion_percentage}%` }} />
                    </div>
                    <span className="text-xs text-gray-500">{project.completion_percentage}%</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1 capitalize">{project.type?.replace(/_/g, ' ')}</p>
                </div>
              </Link>
            ))}
            {projects.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-6">No research projects yet</p>
            )}
          </div>
        </div>

        {/* Quick actions + AI */}
        <div className="space-y-4">
          {/* AI Assistant */}
          <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-2xl p-5 text-white">
            <div className="flex items-center gap-2 mb-2">
              <Brain className="w-5 h-5" />
              <h3 className="font-semibold">AI Academic Assistant</h3>
            </div>
            <p className="text-purple-200 text-sm mb-3">Get research guidance, writing help, and insights</p>
            <Link href="/ai-assistant" className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-medium transition w-full justify-center">
              Ask AI <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Quick actions */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3 text-sm">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: Target, label: 'My Goals', href: '/goals', color: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20' },
                { icon: BookOpen, label: 'Courses', href: '/courses', color: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20' },
                { icon: Calendar, label: 'Attendance', href: '/attendance', color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20' },
                { icon: Award, label: 'Certificates', href: '/certifications', color: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20' },
              ].map(({ icon: Icon, label, href, color }) => (
                <Link key={href} href={href} className={`flex flex-col items-center gap-2 p-3 ${color} rounded-xl hover:opacity-80 transition`}>
                  <Icon className="w-5 h-5" />
                  <span className="text-xs font-medium">{label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Goals */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
          <h2 className="font-semibold text-gray-900 dark:text-white">My Pending Goals</h2>
          <Link href="/goals" className="text-xs text-primary-600 font-medium flex items-center gap-1">
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="divide-y divide-gray-50 dark:divide-gray-800">
          {recentActivity.slice(0, 5).map((activity: any, i: number) => (
            <div key={i} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
              <div className="w-2 h-2 rounded-full bg-primary-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{activity.title}</p>
                <p className="text-xs text-gray-400 capitalize">{activity.type?.replace(/_/g, ' ')}</p>
              </div>
              <span className="text-xs text-gray-400 flex-shrink-0">{format(new Date(activity.created_at), 'MMM d')}</span>
            </div>
          ))}
          {recentActivity.length === 0 && (
            <div className="text-center py-8 text-gray-400 text-sm">No recent activity</div>
          )}
        </div>
      </div>
    </div>
  );
}

function ScholarSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-36 bg-gray-300 dark:bg-gray-700 rounded-2xl" />
      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-gray-200 dark:bg-gray-700 rounded-2xl" />)}
      </div>
      <div className="grid grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => <div key={i} className="h-64 bg-gray-200 dark:bg-gray-700 rounded-2xl" />)}
      </div>
    </div>
  );
}
