import crypto from 'crypto';
import bcrypt from 'bcryptjs';

export function generateOtp(): string {
  return String(crypto.randomInt(100000, 999999));
}

export async function hashOtp(otp: string): Promise<string> {
  return bcrypt.hash(otp, 10);
}

export async function verifyOtp(otp: string, hash: string): Promise<boolean> {
  return bcrypt.compare(otp, hash);
}
