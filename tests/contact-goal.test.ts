// Клики по контактам → цели Метрики (единый перехватчик на весь сайт).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contactGoal } from '../src/lib/contact-goal.ts';

test('телефон, Telegram, WhatsApp, почта', () => {
  assert.equal(contactGoal('tel:+79032990029'), 'click_phone');
  assert.equal(contactGoal('https://t.me/romanmanro'), 'click_telegram');
  assert.equal(contactGoal('https://t.me/thebestmac_bot?start=sell'), 'click_telegram');
  assert.equal(contactGoal('https://wa.me/79032990029'), 'click_whatsapp');
  assert.equal(contactGoal('https://api.whatsapp.com/send?phone=79032990029'), 'click_whatsapp');
  assert.equal(contactGoal('mailto:info@bestmac.ru'), 'click_email');
});

test('обычные ссылки — не контакт', () => {
  for (const href of ['/sell', 'https://bestmac.ru/ceny', 'https://avito.ru/x', '', '#zayavka', 'https://notme.ru/t.me/x']) {
    assert.equal(contactGoal(href), null, href);
  }
});

test('контакты партнёров — не заявки BestMac', () => {
  assert.equal(contactGoal('tel:+74953695162'), null);
  assert.equal(contactGoal('mailto:info@appleprofessional.ru'), null);
});
