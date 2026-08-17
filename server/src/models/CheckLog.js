import mongoose from 'mongoose';

const checkLogSchema = new mongoose.Schema(
  {
    monitor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Monitor',
      required: [true, 'Monitör zorunludur'],
      index: true,
    },
    status: {
      type: String,
      enum: ['up', 'down'],
      required: true,
    },
    responseTime: {
      // milisaniye
      type: Number,
      default: null,
    },
    statusCode: {
      type: Number,
      default: null,
    },
    reason: {
      // down sebebi: "HTTP 503", "Zaman aşımı (10 sn)", DNS hatası vb.
      type: String,
      trim: true,
      default: '',
    },
    checkedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { versionKey: false }
);

checkLogSchema.set('toJSON', {
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    return ret;
  },
});

export default mongoose.model('CheckLog', checkLogSchema);
