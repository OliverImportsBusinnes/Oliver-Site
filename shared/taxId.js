/* =========================================================================
   CPF e CNPJ.
   -------------------------------------------------------------------------
   Usado pelo formulário (para avisar na hora) e pelo servidor (que é quem
   vale). A API de licenciamento confere os mesmos dígitos verificadores do
   outro lado, então um documento que passa aqui passa lá.
   ========================================================================= */

/** Só os dígitos, ou texto vazio. */
export function onlyDigits(value) {
  return String(value ?? '').replace(/\D/g, '');
}

function allEqual(digits) {
  return [...digits].every((char) => char === digits[0]);
}

function cpfDigit(digits, length) {
  let sum = 0;
  for (let i = 0; i < length; i += 1) {
    sum += Number(digits[i]) * (length + 1 - i);
  }
  const rest = (sum * 10) % 11;
  return rest === 10 ? 0 : rest;
}

export function isValidCpf(digits) {
  if (digits.length !== 11 || allEqual(digits)) return false;
  return (
    cpfDigit(digits, 9) === Number(digits[9]) &&
    cpfDigit(digits, 10) === Number(digits[10])
  );
}

function cnpjDigit(digits, weights) {
  let sum = 0;
  for (let i = 0; i < weights.length; i += 1) {
    sum += Number(digits[i]) * weights[i];
  }
  const rest = sum % 11;
  return rest < 2 ? 0 : 11 - rest;
}

export function isValidCnpj(digits) {
  if (digits.length !== 14 || allEqual(digits)) return false;
  return (
    cnpjDigit(digits, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) ===
      Number(digits[12]) &&
    cnpjDigit(digits, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) ===
      Number(digits[13])
  );
}

/** Aceita com ou sem pontuação. */
export function isValidTaxId(value) {
  const digits = onlyDigits(value);
  if (digits.length === 11) return isValidCpf(digits);
  if (digits.length === 14) return isValidCnpj(digits);
  return false;
}

/** 000.000.000-00 ou 00.000.000/0000-00, conforme o tamanho. */
export function formatTaxId(value) {
  const digits = onlyDigits(value).slice(0, 14);
  if (digits.length <= 11) {
    return digits
      .replace(/^(\d{3})(\d)/, '$1.$2')
      .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1-$2');
  }
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}
