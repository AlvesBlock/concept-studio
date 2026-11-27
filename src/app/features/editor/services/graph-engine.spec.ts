import { TestBed } from '@angular/core/testing';
import { vi, describe, it, expect } from 'vitest';
import { GraphEngine } from './graph-engine';

vi.mock('@antv/x6', () => ({
  Graph: vi.fn(), History: vi.fn(), Selection: vi.fn(),
  Keyboard: vi.fn(), Clipboard: vi.fn()
}));

describe('GraphEngine', () => {
  it('guards access before initialization', () => {
    TestBed.configureTestingModule({ providers: [GraphEngine] });
    const service = TestBed.inject(GraphEngine);
    expect(() => service.getGraph()).toThrow();
    expect(() => service.destroy()).not.toThrow();
  });
});
