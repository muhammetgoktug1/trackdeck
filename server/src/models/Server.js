import mongoose from 'mongoose';

const serverSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Sunucu adı zorunludur'],
      trim: true,
      maxlength: [120, 'Sunucu adı en fazla 120 karakter olabilir'],
    },
    provider: {
      // opsiyonel bağlantı: sağlayıcı (İçerik Tanımlamaları → Sağlayıcılar)
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Provider',
      default: null,
    },
    ipAddress: {
      type: String,
      trim: true,
      maxlength: [100, 'IP adresi çok uzun'],
      default: '',
    },
    purchasedAt: {
      // satın alma / kiralama başlangıç tarihi
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

serverSchema.set('toJSON', {
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model('Server', serverSchema);
