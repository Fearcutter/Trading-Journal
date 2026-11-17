import type { DrawdownRule } from '../prop-ev';
import type { BreachMode } from './types';

/**
 * A balance with a drawdown floor. Keeps apart: balance, best closing balance (or best balance,
 * for intraday trailing), the floor in force now, and whether the floor has locked.
 */
export class SimAccount {
  balance: number;
  high: number;
  floor: number;
  locked = false;
  blown = false;
  readonly start: number;
  readonly rule: DrawdownRule;
  readonly breach: BreachMode;

  constructor(start: number, rule: DrawdownRule, breach: BreachMode) {
    this.start = start;
    this.rule = rule;
    this.breach = breach;
    this.balance = start;
    this.high = start;
    this.floor = start - rule.amount;
    this.applyLock();
  }

  /** The floor the drawdown stops trailing at, or null if it never stops. */
  get lockLevel(): number | null {
    return this.rule.lockAboveStart === null ? null : this.start + this.rule.lockAboveStart;
  }

  /** Room left before the floor. */
  get room(): number {
    return this.balance - this.floor;
  }

  private applyLock() {
    const lock = this.lockLevel;
    if (lock !== null && this.floor >= lock) {
      this.floor = lock;
      this.locked = true;
    }
  }

  private trail() {
    if (this.rule.type === 'static' || this.locked) return;
    this.high = Math.max(this.high, this.balance);
    this.floor = Math.max(this.floor, this.high - this.rule.amount);
    this.applyLock();
  }

  /** A closed trade. Returns true if it broke the account. */
  trade(pl: number): boolean {
    this.balance += pl;
    if (this.breach === 'intraday' && this.balance <= this.floor + 1e-9) {
      this.blown = true;
      return true;
    }
    if (this.rule.type === 'intraday_trailing') this.trail();
    return false;
  }

  /** End of day: check the close (close-only mode) and move an end-of-day floor up. */
  close(): boolean {
    if (this.breach === 'close' && this.balance <= this.floor + 1e-9) {
      this.blown = true;
      return true;
    }
    if (this.rule.type === 'eod_trailing') this.trail();
    return false;
  }

  /** After a payout the floor stops where it is. */
  withdraw(amount: number) {
    this.balance -= amount;
    this.locked = true;
  }
}
