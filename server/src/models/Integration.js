import mongoose from 'mongoose';

const templateField = {
  type: String,
  trim: true,
  default: '',
  maxlength: [2000, 'Şablon en fazla 2000 karakter olabilir'],
};

const integrationSchema = new mongoose.Schema(
  {
    // her entegrasyon tipinden tek kayıt
    type: {
      type: String,
      enum: ['whatsapp', 'slack', 'discord'],
      required: true,
      unique: true,
    },
    enabled: {
      type: Boolean,
      default: false,
    },
    // WhatsApp köprü ayarları (env yerine panelden yönetilir)
    apiUrl: { type: String, trim: true, default: '' },
    apiKey: { type: String, trim: true, default: '' },
    session: { type: String, trim: true, default: 'default' },
    chatId: { type: String, trim: true, default: '' },
    // Slack / Discord webhook adresi
    webhookUrl: { type: String, trim: true, default: '' },

    // Bildirim tercihleri
    notifyUptime: { type: Boolean, default: true },
    notifyDomains: { type: Boolean, default: true },
    // GitHub bildirimleri (anahtar + tür bazlı tercihler)
    notifyGithub: { type: Boolean, default: false },
    notifyGithubCi: { type: Boolean, default: true },
    notifyGithubRelease: { type: Boolean, default: true },
    // issue bildirimi varsayılan kapalı (gürültü az olsun)
    notifyGithubIssue: { type: Boolean, default: false },
    // kaç gün kalınca bildirilsin (örn: [45, 30, 15])
    domainThresholds: { type: [Number], default: () => [45, 30, 15] },

    // Gönderilecek mesaj şablonları; boş bırakılan varsayılana döner
    templates: {
      type: {
        uptimeDown: templateField,
        uptimeUp: templateField,
        domainExpiry: templateField,
        domainExpired: templateField,
        githubCi: templateField,
        githubRelease: templateField,
        githubIssue: templateField,
      },
      default: () => ({}),
    },

    lastTestedAt: { type: Date, default: null },
    lastTestOk: { type: Boolean, default: null },
  },
  { timestamps: true }
);

integrationSchema.set('toJSON', {
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model('Integration', integrationSchema);
