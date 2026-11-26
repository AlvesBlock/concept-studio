import { TestBed } from '@angular/core/testing';
import { LayoutEngine } from './layout-engine';

describe('LayoutEngine', () => {
  let service: LayoutEngine;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LayoutEngine);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
