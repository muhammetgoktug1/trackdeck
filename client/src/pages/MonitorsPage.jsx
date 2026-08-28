import MonitorTable from '../components/MonitorTable.jsx';
import PageContainer from '../components/PageContainer.jsx';

export default function MonitorsPage({
  list,
  loading,
  checkingIds,
  onPageChange,
  onLimitChange,
  onCheck,
  onEdit,
  onDelete,
  onDetail,
  onAdd,
}) {
  return (
    <PageContainer>
      <MonitorTable
        monitors={list.data}
        loading={loading}
        checkingIds={checkingIds}
        onCheck={onCheck}
        onEdit={onEdit}
        onDelete={onDelete}
        onDetail={onDetail}
        onAdd={onAdd}
        pagination={{
          page: list.page,
          limit: list.limit,
          total: list.total,
          onPageChange,
          onLimitChange,
        }}
      />
    </PageContainer>
  );
}
