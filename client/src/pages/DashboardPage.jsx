import StatsCards from '../components/StatsCards.jsx';

export default function DashboardPage({ stats, onNavigate }) {
  return (
    <div className="flex flex-col gap-5">
      <StatsCards stats={stats} onNavigate={onNavigate} />
      <p className="text-center text-xs text-zinc-700">
        Kartlara tıklayarak ilgili bölüme geçebilirsin
      </p>
    </div>
  );
}
