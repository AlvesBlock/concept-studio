import { TestBed } from '@angular/core/testing';
import { vi, describe, it, expect } from 'vitest';
import { MapCanvas } from './map-canvas';
import { GraphEngine } from '../../services/graph-engine';

vi.mock('@antv/x6', () => ({
  Graph: vi.fn(), History: vi.fn(), Selection: vi.fn(),
  Keyboard: vi.fn(), Clipboard: vi.fn()
}));

describe('MapCanvas', () => {
  it('renders the example through the graph engine and disposes it', async () => {
    const graph = { addNode: vi.fn(), addEdge: vi.fn(), cleanHistory: vi.fn(), on: vi.fn() };
    const engine = { initialize: vi.fn(), getGraph: vi.fn(() => graph),
      fitContent: vi.fn(), destroy: vi.fn() };
    await TestBed.configureTestingModule({ imports: [MapCanvas] })
      .overrideComponent(MapCanvas, { set: { providers: [{ provide: GraphEngine, useValue: engine }] } })
      .compileComponents();
    const fixture = TestBed.createComponent(MapCanvas);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(engine.initialize).toHaveBeenCalledOnce();
    expect(graph.addNode).toHaveBeenCalledTimes(3);
    expect(graph.addEdge).toHaveBeenCalledTimes(2);
    expect(fixture.nativeElement.querySelector('input').value).toBe('Como os conceitos se relacionam?');
    fixture.destroy();
    expect(engine.destroy).toHaveBeenCalledOnce();
  });
});
