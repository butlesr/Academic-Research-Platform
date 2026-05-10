'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GraduationCap, LayoutDashboard, Users, Target, MessageSquare,
  BookOpen, ClipboardList, BarChart3, FileText, Bell, Settings,
  ChevronLeft, ChevronRight, FlaskConical, Video, Award,
  CalendarDays, Brain, Shield, PieChart, LogOut,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';

const navByRole: Record<string, NavItem[]> = {
  professor: [
    { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard/guide' },
    { label: 'Research Scholars', icon: Users, href: '/scholars' },
    { label: 'Goals & Milestones', icon: Target, href: '/goals' },
    { label: 'Batch Progress', icon: PieChart, href: '/progress' },
    { label: 'Chat', icon: MessageSquare, href: '/chat', badge: 'new' },
    { label: 'Courses', icon: BookOpen, href: '/courses' },
    { label: 'Assignments', icon: ClipboardList, href: '/assignments' },
    { label: 'Exams', icon: FlaskConical, href: '/exams' },
    { label: 'Attendance', icon: CalendarDays, href: '/attendance' },
    { label: 'Meetings', icon: Video, href: '/meetings' },
    { label: 'Analytics', icon: BarChart3, href: '/analytics' },
    { label: 'Reports', icon: FileText, href: '/reports' },
    { label: 'AI Assistant', icon: Brain, href: '/ai-assistant' },
    { label: 'Certifications', icon: Award, href: '/certifications' },
  ],
  phd_scholar: [
    { label: 'My Dashboard', icon: LayoutDashboard, href: '/dashboard/scholar' },
    { label: 'My Research', icon: FlaskConical, href: '/research' },
    { label: 'Goals & Tasks', icon: Target, href: '/goals' },
    { label: 'Chat', icon: MessageSquare, href: '/chat', badge: 'new' },
    { label: 'Courses', icon: BookOpen, href: '/courses' },
    { label: 'Assignments', icon: ClipboardList, href: '/assignments' },
    { label: 'Exams', icon: FlaskConical, href: '/exams' },
    { label: 'Attendance', icon: CalendarDays, href: '/attendance' },
    { label: 'Meetings', icon: Video, href: '/meetings' },
    { label: 'My Progress', icon: BarChart3, href: '/analytics' },
    { label: 'Files', icon: FileText, href: '/files' },
    { label: 'AI Assistant', icon: Brain, href: '/ai-assistant' },
    { label: 'Certificates', icon: Award, href: '/certifications' },
  ],
  super_admin: [
    { label: 'Admin Dashboard', icon: LayoutDashboard, href: '/admin' },
    { label: 'Users', icon: Users, href: '/admin/users' },
    { label: 'Institutions', icon: GraduationCap, href: '/admin/institutions' },
    { label: 'Analytics', icon: BarChart3, href: '/admin/analytics' },
    { label: 'Security', icon: Shield, href: '/admin/security' },
    { label: 'Settings', icon: Settings, href: '/admin/settings' },
  ],
};

interface NavItem {
  label: string;
  icon: any;
  href: string;
  badge?: string;
  children?: NavItem[];
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuthStore();
  const pathname = usePathname();

  const role = user?.role || 'pg_student';
  const navItems = navByRole[role] || navByRole.phd_scholar;

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 256 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="relative flex flex-col bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 h-full shadow-sm overflow-hidden"
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-gray-100 dark:border-gray-800">
        <div className="flex-shrink-0 w-9 h-9 bg-gradient-to-br from-primary-600 to-academic-blue rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/30">
          <GraduationCap className="w-5 h-5 text-white" />
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">Academic</p>
              <p className="text-xs text-gray-500 leading-tight">Research Platform</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* User info */}
      {!collapsed && (
        <div className="mx-3 my-3 p-3 bg-gradient-to-br from-primary-50 to-blue-50 dark:from-primary-900/20 dark:to-blue-900/20 rounded-xl border border-primary-100 dark:border-primary-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-primary-600 dark:text-primary-400 capitalize">
                {role.replace(/_/g, ' ')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group relative',
                isActive
                  ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
              )}
            >
              <Icon className={cn('flex-shrink-0 w-4.5 h-4.5 w-4 h-4', isActive ? 'text-primary-600' : 'text-gray-400 group-hover:text-gray-600')} />
              <AnimatePresence>
                {!collapsed && (
                  <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 truncate">
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
              {!collapsed && item.badge && (
                <span className="px-1.5 py-0.5 bg-primary-600 text-white text-xs rounded-full font-medium">
                  {item.badge}
                </span>
              )}
              {isActive && (
                <span className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary-600 rounded-l-full" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom actions */}
      <div className="p-2 border-t border-gray-100 dark:border-gray-800 space-y-0.5">
        <Link href="/settings" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all">
          <Settings className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Settings</span>}
        </Link>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 w-6 h-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full flex items-center justify-center shadow-sm hover:shadow-md transition-all z-10"
      >
        {collapsed ? <ChevronRight className="w-3 h-3 text-gray-500" /> : <ChevronLeft className="w-3 h-3 text-gray-500" />}
      </button>
    </motion.aside>
  );
}
