import mongoose from 'mongoose';

// Tek kayıt: GitHub PAT (panelden yönetilir, istemciye asla gönderilmez)
const githubSettingSchema = new mongoose.Schema(
  {
    // Personal Access Token; boş = anonim erişim (yalnız public repolar)
    token: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

githubSettingSchema.statics.getSingleton = async function () {
  let doc = await this.findOne();
  if (!doc) doc = await this.create({});
  return doc;
};

githubSettingSchema.set('toJSON', {
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    // token yanlışlıkla serialize edilmesin
    delete ret.token;
    return ret;
  },
});

export default mongoose.model('GithubSetting', githubSettingSchema);
