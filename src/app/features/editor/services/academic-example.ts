import type { ConceptDocument } from './presentation-renderer';
export function academicExample():ConceptDocument {
  const nodes:ConceptDocument['nodes']=[],edges:ConceptDocument['edges']=[];
  const add=(id:string,label:string,x:number,y:number,color:string,stroke:string)=>{
    nodes.push({id,label,type:'concept',position:{x,y},size:{width:230,height:60},style:{fill:color,stroke,fontSize:16}});
  };
  const blue='#dbeafe',green='#dcfce7',purple='#f3e8ff',orange='#ffedd5';
  add('root','Gestão do Conhecimento',585,10,blue,'#1d4ed8');
  add('carnaval','Carnaval de Salvador',40,200,blue,'#2563eb');
  add('sistema','Sistema sociotécnico',40,370,blue,'#2563eb');
  add('tics','TICs',350,200,green,'#15803d');
  add('dados','Dados',350,370,green,'#15803d');
  add('info','Informação',350,540,green,'#15803d');
  add('conhecimento','Conhecimento',350,710,green,'#15803d');
  add('decisao','Tomada de decisão',350,880,green,'#15803d');
  add('seguranca','Segurança Pública',350,1050,green,'#15803d');
  add('seci','Modelo SECI',740,200,purple,'#9333ea');
  add('tacito','Conhecimento tácito',650,410,purple,'#9333ea');
  add('explicito','Conhecimento explícito',940,410,purple,'#9333ea');
  add('aprendizagem','Aprendizagem organizacional',940,670,purple,'#9333ea');
  add('governanca','Governança da informação',1260,200,orange,'#c2410c');
  add('direitos','Direitos Digitais',1260,670,orange,'#c2410c');
  add('cibernetica','Segurança Cibernética',1260,410,orange,'#c2410c');
  function relate(source:string,label:string,target:string,x?:number,y?:number){
    const a=nodes.find(n=>n.id===source)!,b=nodes.find(n=>n.id===target)!;
    const id='p'+edges.length;
    nodes.push({id,type:'linking_phrase',label,position:{x:x??((a.position.x+b.position.x)/2-5),y:y??((a.position.y+b.position.y)/2+20)},size:{width:240,height:48},style:{fill:'transparent',stroke:'none',fontSize:13}});
    edges.push({id:'e'+edges.length,source,target:id},{id:'e'+(edges.length+1),source:id,target});
  }
  relate('root','aplica-se ao','carnaval',155,100);
  relate('root','é apoiada pelas','tics',410,110);
  relate('root','fundamenta-se, entre outros, no','seci',745,105);
  relate('root','requer','governanca',1130,100);
  relate('carnaval','constitui um','sistema');
  relate('tics','permitem coletar e processar','dados');
  relate('dados','quando contextualizados geram','info');
  relate('info','quando interpretada contribui para o','conhecimento');
  relate('conhecimento','fundamenta a','decisao');
  relate('decisao','orienta a','seguranca');
  relate('seci','promove a conversão do','tacito',620,310);
  relate('seci','promove a conversão do','explicito',955,310);
  relate('tacito','converte-se por externalização em','explicito',790,475);
  relate('explicito','converte-se por internalização em','tacito',790,545);
  relate('explicito','favorece a','aprendizagem',935,585);
  relate('governanca','contribui para a proteção dos','direitos',1410,540);
  relate('governanca','estabelece diretrizes de','cibernetica',1200,310);
  relate('seguranca','deve respeitar os','direitos',880,1050);
  return {schemaVersion:1,id:'academic-example',type:'concept-map',title:'Gestão do Conhecimento e TICs',metadata:{focusQuestion:'Como a Gestão do Conhecimento e as TICs contribuem para a atuação integrada da Segurança Pública no Carnaval de Salvador, respeitando os Direitos Digitais?'},nodes,edges};
}
