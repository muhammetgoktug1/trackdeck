import MonitorTable from '../components/MonitorTable.jsx';

export default function MonitorsPage({
  list,
  loading,
  checkingIds,
  onPageChange,
  onLimitChange,
  onCheck,
  onEdit,
  onDelete,
  onHistory,
  onAdd,
}) {
  return (
    <MonitorTable
      monitors={list.data}
      loading={loading}
      checkingIds={checkingIds}
      onCheck={onCheck}
      onEdit={onEdit}
      onDelete={onDelete}
      onHistory={onHistory}
      onAdd={onAdd}
      pagination={{
        page: list.page,
        limit: list.limit,
        total: list.total,
        onPageChange,
        onLimitChange,
      }}
    />
  );
}
