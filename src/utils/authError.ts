import { AuthApiError } from '@supabase/supabase-js';

const messagesByCode: Record<string, string> = {
  invalid_credentials: 'E-mail ou senha inválidos.',
  email_not_confirmed: 'Confirme seu e-mail antes de entrar.',
  over_request_rate_limit: 'Muitas tentativas. Aguarde um momento e tente novamente.',
  session_not_found: 'Sua sessão expirou. Entre novamente.',
};

export function getAuthErrorMessage(error: unknown): string {
  if (error instanceof AuthApiError) {
    if (messagesByCode[error.code]) {
      return messagesByCode[error.code];
    }

    const normalizedMessage = error.message.toLowerCase();
    if (normalizedMessage.includes('invalid login credentials')) {
      return messagesByCode.invalid_credentials;
    }
    if (normalizedMessage.includes('email not confirmed')) {
      return messagesByCode.email_not_confirmed;
    }
  }

  return 'Não foi possível concluir a autenticação. Tente novamente.';
}
