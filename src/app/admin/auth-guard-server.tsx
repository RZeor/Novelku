import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';

export async function AdminAuthGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user || user.role !== 'ADMIN') {
    redirect('/403');
  }

  return <>{children}</>;
}
