// Bildirim mesaj şablonları: {degisken} yer tutucuları kullanıcı metniyle değiştirilir.
// Boş şablon = varsayılan kullanılır.
export const DEFAULT_TEMPLATES = {
  uptimeDown:
    '🔴 *Site Erişilemez*\n\n🌐 {name}\n🔗 {url}\n📊 {code}\n💬 {reason}\n🕐 {time}',
  uptimeUp:
    '🟢 *Site Yeniden Erişilebilir*\n\n🌐 {name}\n🔗 {url}\n⚡ Yanıt: {responseTime} ms\n🕐 {time}',
  domainExpiry:
    '⏰ *Domain Bitiş Uyarısı*\n\n🌐 {name}\n⏳ {days} gün kaldı\n📅 Bitiş: {expiresAt}\n🕐 {time}',
  domainExpired:
    '⛔ *Domain Süresi Doldu*\n\n🌐 {name}\n📅 Bitiş: {expiresAt}\n💡 Yenileme gerekli\n🕐 {time}',
  githubCi:
    '🔴 *CI Kırıldı*\n\n📦 {repo}\n⚙️ {workflow} #{runNumber}\n🌿 {branch}\n💬 {title}\n🔗 {url}\n🕐 {time}',
  githubRelease:
    '🏷️ *Yeni Release*\n\n📦 {repo}\n🔖 {tag}\n🔗 {url}\n🕐 {time}',
  githubIssue:
    '🐛 *Yeni Issue*\n\n📦 {repo}\n#️⃣ #{number}\n💬 {title}\n🔗 {url}\n🕐 {time}',
};

export const TEMPLATE_KEYS = Object.keys(DEFAULT_TEMPLATES);

export function renderTemplate(text, vars) {
  return String(text ?? '').replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? '');
}
