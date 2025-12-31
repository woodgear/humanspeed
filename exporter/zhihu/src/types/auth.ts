export interface QRCodeResult {
  base64: string;
  sessionId: string;
  expiresIn: number;
}

export interface LoginStatus {
  isLoggedIn: boolean;
  status: 'pending' | 'scanned' | 'confirmed' | 'expired' | 'error';
  message?: string;
}

export interface Session {
  cookies: Array<{
    name: string;
    value: string;
    domain: string;
    path: string;
    expires?: number;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: 'Strict' | 'Lax' | 'None';
  }>;
  localStorage: Record<string, string>;
  timestamp: number;
}
