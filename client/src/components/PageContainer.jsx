// Tüm sayfa içeriklerinin ortak kabuğu — genişlik ve dikey aralık sözleşmesi
// yalnızca buradan yönetilir. Yeni sayfalar mutlaka bunun içinde render
// edilmelidir (Envanter dahil tüm sayfalar full-width çalışır).
export default function PageContainer({ children }) {
  return <div className="flex w-full flex-col gap-5">{children}</div>;
}
