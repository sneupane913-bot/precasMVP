import { MaintenanceGate } from '@/components/MaintenanceGate';

/**
 * Route group for everything a student sees. The owner switch gates this
 * layout, so one toggle takes down the whole student experience while leaving
 * /owner reachable to turn it back on.
 */
export const dynamic = 'force-dynamic';

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return <MaintenanceGate>{children}</MaintenanceGate>;
}
