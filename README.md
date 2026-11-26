# Concept Studio

Open-source visual knowledge platform. Create, connect and understand.

[Português](README.pt-BR.md) · [Roadmap](ROADMAP.md) · [Contributing](CONTRIBUTING.md)

## Status
Early prototype: interactive concept-map canvas, movable nodes, linking phrases, zoom and undo/redo foundation. General-purpose document editing is under development.

## Development
Use Node.js 22.22.3 and npm 10.9.8 (initial development environment).

```sh
npm ci
npm start
npm run build
npm test -- --watch=false
```

Open http://localhost:4200/editor.

## Direction
Concept maps first; mind maps and other diagrams later. Thematic rooms are optional. Local-first storage, open document formats and optional connected services are planned.

## License
[Apache License 2.0](LICENSE). Dependencies retain their own licenses.
