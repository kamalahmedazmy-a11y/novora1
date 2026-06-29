import mongoose from 'mongoose';

// Stored refresh tokens (hashed) so sessions can be rotated and revoked.
// Access tokens are short-lived (15m); the refresh token (7d) mints new ones.
const refreshTokenSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, index: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
}, { timestamps: true });

// auto-expire documents at expiry (TTL index)
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('RefreshToken', refreshTokenSchema);
