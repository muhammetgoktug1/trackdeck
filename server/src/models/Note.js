import mongoose from 'mongoose';

const noteSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Not başlığı zorunludur'],
      trim: true,
      maxlength: [200, 'Not başlığı en fazla 200 karakter olabilir'],
    },
    category: {
      // opsiyonel bağlantı — İçerik Tanımlamaları → Kategoriler
      type: mongoose.Schema.Types.ObjectId,
      ref: 'NoteCategory',
      default: null,
    },
    content: {
      type: String,
      trim: true,
      maxlength: [20000, 'Not içeriği en fazla 20000 karakter olabilir'],
      default: '',
    },
    pinned: {
      // sabitlenmiş notlar listenin başında durur
      type: Boolean,
      default: false,
    },
    links: {
      // faydalı bağlantılar: GitHub reposu, web sayfası vb.
      type: [
        {
          url: { type: String, required: [true, 'Bağlantı adresi zorunludur'], trim: true, maxlength: [2048, 'Bağlantı adresi çok uzun'] },
          label: { type: String, trim: true, maxlength: [200, 'Bağlantı etiketi en fazla 200 karakter olabilir'], default: '' },
        },
      ],
      default: () => [],
    },
    attachments: {
      // nota eklenen dosyalar (pdf, docx, görsel vb.) — diskte server/uploads altında
      type: [
        {
          fileName: { type: String, required: true },
          storedName: { type: String, required: true },
          mimeType: { type: String, default: '' },
          size: { type: Number, default: 0 },
        },
      ],
      default: () => [],
    },
  },
  { timestamps: true }
);

noteSchema.set('toJSON', {
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model('Note', noteSchema);
