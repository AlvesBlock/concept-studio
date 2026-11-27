import { Component, input, output, signal, computed, effect, OnDestroy } from '@angular/core';
import { ConceptDocument, initialSettings, PresentationSettings, renderPresentation, rasterize } from '../../services/presentation-renderer';
@Component({selector:'app-presentation-panel',standalone:true,templateUrl:'./presentation-panel.html',styleUrl:'./presentation-panel.scss'})
export class PresentationPanel implements OnDestroy {
  readonly source=input.required<ConceptDocument>();
  readonly closed=output<void>();
  readonly settings=signal<PresentationSettings|null>(null);
  readonly preview=signal('');
  readonly busy=signal(false);
  readonly message=signal('');
  readonly scale=signal(2);
  readonly concepts=computed(()=>this.source().nodes.filter(n=>n.type==='concept'));
  readonly rendered=computed(()=>{const s=this.settings();return s?renderPresentation(this.source(),s):null;});
  private url='';
  constructor(){
    effect(()=>{const doc=this.source();this.settings.set(this.restore(doc));});
    effect(()=>{const image=this.rendered();if(!image)return;if(this.url)URL.revokeObjectURL(this.url);this.url=URL.createObjectURL(new Blob([image.svg],{type:'image/svg+xml;charset=utf-8'}));this.preview.set(this.url);});
  }
  private storageKey(doc:ConceptDocument){return 'concept-studio.presentation.v1.'+doc.id;}
  private restore(doc:ConceptDocument):PresentationSettings {
    const defaults=initialSettings(doc);
    try {
      const raw=localStorage.getItem(this.storageKey(doc));
      if(!raw)return defaults;
      const saved=JSON.parse(raw);
      if(saved.signature!==JSON.stringify(doc.nodes.map(n=>n.id)) || !saved.settings)return defaults;
      const s=saved.settings as PresentationSettings;
      if(!['academic','minimal','original'].includes(s.theme)||typeof s.grouped!=='boolean'||typeof s.title!=='string'||typeof s.question!=='string'||!Array.isArray(s.groups)||!s.groups.length||s.groups.length>24||!s.groups.every(g=>typeof g.id==='string'&&typeof g.title==='string'&&/^#[0-9a-f]{6}$/i.test(g.color))||!s.assignments||!Array.isArray(s.hidden)||typeof s.root!=='string')return defaults;
      return s;
    }catch{return defaults;}
  }
  saveSettings(){const s=this.settings();if(!s)return;try{const doc=this.source();localStorage.setItem(this.storageKey(doc),JSON.stringify({signature:JSON.stringify(doc.nodes.map(n=>n.id)),settings:s}));this.message.set('Configuração da apresentação salva neste navegador.');}catch{this.message.set('Não foi possível salvar a configuração.');}}
  patch(value:Partial<PresentationSettings>){this.settings.update(s=>s?{...s,...value}:s);}
  setGroup(id:string,group:string){this.settings.update(s=>s?{...s,assignments:{...s.assignments,[id]:group}}:s);}
  updateGroup(id:string,field:'title'|'color',value:string){this.settings.update(s=>s?{...s,groups:s.groups.map(g=>g.id===id?{...g,[field]:value}:g)}:s);}
  addGroup(){this.settings.update(s=>s&&s.groups.length<24?{...s,groups:[...s.groups,{id:crypto.randomUUID(),title:'Novo grupo',color:'#0e7490'}]}:s);}
  removeGroup(id:string){this.settings.update(s=>s&&s.groups.length>1?{...s,groups:s.groups.filter(g=>g.id!==id)}:s);}
  toggleNode(id:string,visible:boolean){this.settings.update(s=>s?{...s,hidden:visible?s.hidden.filter(x=>x!==id):[...new Set([...s.hidden,id])]}:s);}
  reset(){this.settings.set(initialSettings(this.source()));}
  async download(format:'svg'|'png'|'jpeg'){
    const image=this.rendered();if(!image||this.busy())return;this.busy.set(true);
    try{const blob=format==='svg'?new Blob([image.svg],{type:'image/svg+xml;charset=utf-8'}):await rasterize(image.svg,image.width,image.height,format,this.scale());
      const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=(this.settings()?.title||'mapa').replace(/[^\p{L}\p{N}_-]+/gu,'-').slice(0,100)+'.'+(format==='jpeg'?'jpg':format);link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);this.message.set('Arquivo gerado.');
    }catch{this.message.set('Não foi possível exportar. Tente SVG ou menor resolução.');}finally{this.busy.set(false);}
  }
  print(){const image=this.rendered();if(!image)return;const w=window.open('','_blank');if(!w){this.message.set('Permita pop-ups para imprimir ou salvar PDF.');return;}
    const doc=w.document;doc.title='Concept Studio';const style=doc.createElement('style');style.textContent='@page{size:landscape;margin:10mm}body{margin:0}img{display:block;width:100%;max-height:180mm;object-fit:contain}';doc.head.append(style);
    const img=doc.createElement('img');const url=URL.createObjectURL(new Blob([image.svg],{type:'image/svg+xml'}));img.onload=()=>{w.focus();w.print();URL.revokeObjectURL(url);};img.src=url;doc.body.append(img);
  }
  ngOnDestroy(){if(this.url)URL.revokeObjectURL(this.url);}
}
