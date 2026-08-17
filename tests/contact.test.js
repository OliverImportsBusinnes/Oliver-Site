/* Testes dos links de contato: o número precisa ser único e a mensagem
   precisa ir codificada (senão quebra em acento, quebra de linha ou "&"). */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createMailtoLink, createWhatsAppLink } from '../src/utils/contact.js';
import { WHATSAPP_NUMBER, EMAIL } from '../src/data/company.js';

test('o número está em formato internacional, só dígitos', () => {
  assert.match(WHATSAPP_NUMBER, /^\d{12,13}$/);
  assert.equal(WHATSAPP_NUMBER, '5512988232512');
});

test('gera o link do WhatsApp com o número configurado', () => {
  const link = createWhatsAppLink('Olá');
  assert.ok(link.startsWith(`https://wa.me/${WHATSAPP_NUMBER}?text=`));
});

test('codifica acentos, quebras de linha e caracteres especiais', () => {
  const link = createWhatsAppLink('Olá & Automação\nSegunda linha');

  assert.ok(!link.includes('\n'), 'quebra de linha crua quebraria a URL');
  assert.ok(!link.includes(' '), 'espaço cru quebraria a URL');
  assert.ok(link.includes('%0A'), 'quebra de linha deve virar %0A');
  assert.ok(link.includes('%26'), 'o & deve ser codificado');

  const enviado = decodeURIComponent(link.split('text=')[1]);
  assert.equal(enviado, 'Olá & Automação\nSegunda linha');
});

test('mailto leva assunto e corpo codificados', () => {
  const link = createMailtoLink('Corpo com acento: ção', 'Assunto & teste');

  assert.ok(link.startsWith(`mailto:${EMAIL}?subject=`));
  assert.ok(link.includes('&body='));
  assert.equal(
    decodeURIComponent(link.split('subject=')[1].split('&body=')[0]),
    'Assunto & teste'
  );
});
