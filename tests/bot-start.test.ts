// Метка страницы сайта в ссылке на бота: t.me/<bot>?start=<param>.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { botStartParam } from '../src/lib/bot-start.ts';

test('страница → параметр start', () => {
  assert.equal(botStartParam('/'), 'site');
  assert.equal(botStartParam('/sell/mac-mini-2024-m4'), 'site_sell_mac-mini-2024-m4');
  assert.equal(botStartParam('/vykup/srochno/'), 'site_vykup_srochno');
});

test('только разрешённые Telegram символы и не длиннее 64', () => {
  const p = botStartParam('/blog/очень-длинная/' + 'x'.repeat(100) + '?a=1');
  assert.match(p, /^[A-Za-z0-9_-]{1,64}$/);
  assert.ok(p.startsWith('site_blog'));
});
