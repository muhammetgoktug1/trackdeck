import mongoose from 'mongoose';

const domainSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Domain adı zorunludur'],
      trim: true,
      lowercase: true,
      maxlength: [253, 'Domain adı çok uzun'],
    },
    provider: {
      // opsiyonel bağlantı: kayıt firması (İçerik Tanımlamaları → Sağlayıcılar)
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Provider',
      default: null,
    },
    purchasedAt: {
      // satın alma / başlangıç tarihi
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      default: null,
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

domainSchema.set('toJSON', {
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model('Domain', domainSchema);
