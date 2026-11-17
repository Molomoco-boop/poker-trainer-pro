/* Run: npx tsx tests/back.test.ts */
import { createBackController, HistoryLike } from '../src/navigation/backStack';

let failures = 0;
let checks = 0;
const ok = (cond: boolean, msg: string) => { checks++; if (!cond) { failures++; console.log('FAIL', msg); } };

function mockHistory() {
  const stack: unknown[] = [{ ptp: 0 }];
  const h: HistoryLike & { log: string[]; stack: unknown[] } = {
    stack,
    log: [],
    replaceState(data) { stack[stack.length - 1] = data; this.log.push('replace'); },
    pushState(data) { stack.push(data); this.log.push('push:' + (data as { ptp?: number }).ptp); },
    go(delta) { this.log.push('go:' + delta); if (delta < 0) stack.splice(delta); }
  };
  return h;
}

const flush = async (c: ReturnType<typeof createBackController>) => { await Promise.resolve(); c.flush(); };

{
  const c = createBackController();
  const h = mockHistory();
  c.attach(h);
  const closed: string[] = [];
  const a = c.register(() => closed.push('a'));
  const b = c.register(() => closed.push('b'));
  await flush(c);
  ok(c.depth() === 2, 'depth 2 after two registers');
  ok(h.log.filter(x => x.startsWith('push')).length === 2, 'two pushState');
  ok(c.handleBack() === true, 'back closes top');
  ok(closed.join(',') === 'b', 'LIFO: b first');
  ok(c.depth() === 1, 'depth 1');
  await flush(c);
  ok(h.log.some(x => x === 'go:-1'), 'history shrinks');
  ok(c.handleBack() === true, 'back closes a');
  ok(closed.join(',') === 'b,a', 'then a');
  ok(c.handleBack() === false, 'root returns false');
  a(); b(); // already gone
}

{
  const c = createBackController();
  const h = mockHistory();
  c.attach(h);
  const closed: string[] = [];
  c.register(() => closed.push('modal'));
  await flush(c);
  c.notifyPop();
  ok(closed.join(',') === 'modal', 'popstate closes top');
  ok(c.depth() === 0, 'empty after pop');
}

{
  // StrictMode: register, unregister, register — one history entry
  const c = createBackController();
  const h = mockHistory();
  c.attach(h);
  const u1 = c.register(() => {});
  u1();
  c.register(() => {});
  await flush(c);
  const pushes = h.log.filter(x => x.startsWith('push')).length;
  const goes = h.log.filter(x => x.startsWith('go')).length;
  ok(c.depth() === 1, 'strict remount ends at depth 1');
  ok(pushes - goes === 1, `net one history entry (push ${pushes} go ${goes})`);
}

{
  const c = createBackController();
  const h = mockHistory();
  c.attach(h);
  const u = c.register(() => {});
  await flush(c);
  u(); // UI close
  await flush(c);
  ok(c.depth() === 0, 'UI close empties stack');
  ok(h.log.some(x => x.startsWith('go')), 'UI close drops history');
  c.notifyPop(); // ignored pop from history.go
  ok(c.depth() === 0, 'ignored pop does not underflow');
}

console.log(`${checks} checks, ${failures} failures`);
process.exit(failures ? 1 : 0);
