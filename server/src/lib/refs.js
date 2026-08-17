const ID_RE = /^[0-9a-fA-F]{24}$/;

// '' | null | undefined → { value: null }; geçerli id → { value: ObjectId };
// hatalıysa Türkçe hata mesajı ile { error }
export async function resolveRef(Model, value, label) {
  if (value === null || value === undefined || value === '') return { value: null };
  if (!ID_RE.test(value)) return { error: `Geçersiz ${label} kimliği` };
  const doc = await Model.findById(value).select('_id');
  if (!doc) return { error: `Seçilen ${label} bulunamadı` };
  return { value: doc._id };
}

export { ID_RE };
