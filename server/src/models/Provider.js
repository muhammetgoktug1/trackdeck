import mongoose from 'mongoose';

const providerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Sağlayıcı adı zorunludur'],
      trim: true,
      unique: true,
      maxlength: [120, 'Sağlayıcı adı en fazla 120 karakter olabilir'],
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

providerSchema.set('toJSON', {
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model('Provider', providerSchema);
