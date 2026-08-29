import mongoose from 'mongoose';

// Not kategorileri — "İçerik Tanımlamaları" ailesinden (sağlayıcı deseni)
const noteCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Kategori adı zorunludur'],
      unique: true,
      trim: true,
      maxlength: [60, 'Kategori adı en fazla 60 karakter olabilir'],
    },
    // çip rengi (hazır paletten hex değer); kartta ve filtrede kullanılır
    color: {
      type: String,
      trim: true,
      maxlength: [7, 'Renk değeri geçersiz'],
      default: '#64748b',
      validate: {
        validator: (v) => /^#[0-9a-fA-F]{6}$/.test(v),
        message: 'Renk #RRGGBB biçiminde olmalı',
      },
    },
  },
  { timestamps: true }
);

noteCategorySchema.set('toJSON', {
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model('NoteCategory', noteCategorySchema);
