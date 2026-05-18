import { DashNav } from './_components/dash-nav'

export default function DashboardsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="animate-fade-in-up space-y-2">
      <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">Dashboards</h1>
      <DashNav />
      {children}
    </div>
  )
}
