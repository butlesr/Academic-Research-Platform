'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

const roleRoutes: Record<string, string> = {
  super_admin: '/admin',
  admin: '/admin',
  professor: '/dashboard/guide',
  phd_scholar: '/dashboard/scholar',
  pg_student: '/dashboard/student',
  project_student: '/dashboard/student',
  ug_student: '/dashboard/student',
  external_examiner: '/dashboard/examiner',
};

export default function DashboardRedirect() {
  const { user } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (user?.role) {
      router.replace(roleRoutes[user.role] || '/dashboard/scholar');
    }
  }, [user, router]);

  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
