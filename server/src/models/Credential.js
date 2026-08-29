import mongoose from 'mongoose';

// Saklanan hesap şifreleri — passwordEnc AES-256-GCM ile şifreli tutulur ve
// asla istemciye gönderilmez (yalnız reveal ucuyla çözülür).
const credentialSchema = new mongoose.Schema(
  {
    title: {
      // hesap/service adı: "Trendyol Satıcı", "Kişisel Gmail" vb.
      type: String,
      required: [true, 'Başlık zorunludur'],
      trim: true,
      maxlength: [120, 'Başlık en fazla 120 karakter olabilir'],
    },
    category: {
      // opsiyonel bağlantı — Şifreler → Kategoriler sekmesi
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CredentialCategory',
      default: null,
    },
    username: {
      // e-posta, telefon veya kullanıcı adı
      type: String,
      trim: true,
      maxlength: [200, 'Kullanıcı adı en fazla 200 karakter olabilir'],
      default: '',
    },
    // "iv:tag:ciphertext" biçiminde şifreli metin (lib/crypto.js)
    passwordEnc: { type: String, default: '' },
    url: {
      type: String,
      trim: true,
      maxlength: [2048, 'URL çok uzun'],
      default: '',
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [2000, 'Notlar en fazla 2000 karakter olabilir'],
      default: '',
    },
  },
  { timestamps: true }
);

credentialSchema.set('toJSON', {
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    ret.hasPassword = Boolean(ret.passwordEnc);
    delete ret._id;
    delete ret.__v;
    // şifreli metin istemciye gitmez
    delete ret.passwordEnc;
    return ret;
  },
});

export default mongoose.model('Credential', credentialSchema);
