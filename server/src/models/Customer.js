import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema(
  {
    ad: {
      type: String,
      required: [true, 'Ad zorunludur'],
      trim: true,
      maxlength: [80, 'Ad en fazla 80 karakter olabilir'],
    },
    soyadi: {
      type: String,
      required: [true, 'Soyadı zorunludur'],
      trim: true,
      maxlength: [80, 'Soyadı en fazla 80 karakter olabilir'],
    },
    telefon: {
      type: String,
      trim: true,
      maxlength: [40, 'Telefon en fazla 40 karakter olabilir'],
      default: '',
    },
    mail: {
      type: String,
      trim: true,
      maxlength: [160, 'Mail adresi en fazla 160 karakter olabilir'],
      default: '',
    },
    // şirket bağı; yalnızca Şirketler sekmesinde tanımlananlardan seçilir
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      default: null,
    },
  },
  { timestamps: true }
);

customerSchema.set('toJSON', {
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    // toast ve silme onayı "Ad Soyadı" gösterir
    ret.name = [ret.ad, ret.soyadi].filter(Boolean).join(' ').trim();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model('Customer', customerSchema, 'customers');
