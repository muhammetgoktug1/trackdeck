import mongoose from 'mongoose';

const monitorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Monitör adı zorunludur'],
      trim: true,
      maxlength: [120, 'Monitör adı en fazla 120 karakter olabilir'],
    },
    url: {
      type: String,
      required: [true, 'URL zorunludur'],
      trim: true,
      maxlength: [2048, 'URL çok uzun'],
    },
    method: {
      type: String,
      enum: ['GET', 'HEAD'],
      default: 'GET',
    },
    domain: {
      // opsiyonel bağlantı
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Domain',
      default: null,
    },
    server: {
      // opsiyonel bağlantı
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Server',
      default: null,
    },
    interval: {
      // saniye cinsinden kontrol aralığı
      type: Number,
      default: 60,
      min: [10, 'Kontrol aralığı en az 10 saniye olabilir'],
      max: [86400, 'Kontrol aralığı en fazla 86400 saniye olabilir'],
    },
    enabled: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: ['up', 'down', 'paused', 'pending'],
      default: 'pending',
    },
    lastCheckedAt: {
      type: Date,
      default: null,
    },
    lastResponseTime: {
      // milisaniye
      type: Number,
      default: null,
    },
    lastStatusCode: {
      type: Number,
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

monitorSchema.set('toJSON', {
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model('Monitor', monitorSchema);
