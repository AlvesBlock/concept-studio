import { TestBed } from '@angular/core/testing';
import { GraphEngine } from './graph-engine';
describe('GraphEngine', () => {
  it('guards access before initialization', () => {
    TestBed.configureTestingModule({ providers: [GraphEngine] });
    const service = TestBed.inject(GraphEngine);
    expect(() => service.getGraph()).toThrow();
    service.destroy();
  });
});
