import mongoose from 'mongoose';

const githubRepoSchema = new mongoose.Schema(
  {
    owner: {
      type: String,
      required: true,
      trim: true,
      maxlength: [100, 'Sahip adı en fazla 100 karakter olabilir'],
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: [150, 'Repo adı en fazla 150 karakter olabilir'],
    },
    // "kullanici/repo" — eklerken GitHub'dan doğrulanır
    fullName: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    description: { type: String, trim: true, default: '' },
    private: { type: Boolean, default: false },
    defaultBranch: { type: String, trim: true, default: 'main' },
    htmlUrl: { type: String, trim: true, default: '' },
    // repo eklenirkenki son push zamanı (bilgi amaçlı)
    pushedAt: { type: Date, default: null },
    enabled: { type: Boolean, default: true },
  },
  { timestamps: true }
);

githubRepoSchema.set('toJSON', {
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model('GithubRepo', githubRepoSchema);
