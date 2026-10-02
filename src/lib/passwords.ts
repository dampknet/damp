export const MIN_PASSWORD_LENGTH = 8;

export function validatePassword(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  if (!/[A-Za-z]/.test(password))            return "Password must contain at least one letter.";
  if (!/[0-9]/.test(password))               return "Password must contain at least one number.";
  return null;
}
