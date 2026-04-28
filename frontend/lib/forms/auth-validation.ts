const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(value: string): string | null {
  const trimmed = value.trim();

  if (!trimmed) {
    return "Email is required.";
  }

  if (!emailPattern.test(trimmed)) {
    return "Enter a valid email address.";
  }

  return null;
}

export function validatePassword(value: string): string | null {
  if (!value) {
    return "Password is required.";
  }

  if (value.length < 8) {
    return "Password must be at least 8 characters.";
  }

  return null;
}

export function validateFullName(value: string): string | null {
  const trimmed = value.trim();

  if (!trimmed) {
    return "Full name is required.";
  }

  if (trimmed.length < 2) {
    return "Full name must be at least 2 characters.";
  }

  return null;
}

export function validatePasswordConfirmation(
  password: string,
  confirmation: string,
): string | null {
  if (!confirmation) {
    return "Please confirm your password.";
  }

  if (password !== confirmation) {
    return "Passwords do not match.";
  }

  return null;
}
