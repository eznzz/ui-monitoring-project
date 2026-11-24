/* Offline-only adapter. No network, no actual credentials or tokens. */
const id=()=>crypto.randomUUID();
const reply=(data:unknown,status=200)=>new Response(status===204?null:JSON.stringify(data),{status,headers:{"Content-Type":"application/json"}});
const fail=(status:number,code="")=>reply({code},status);
const roles=["sec01b_tenant_admin_reader","sec01b_user_creator","sec01b4_delegator","sec01b4_object_reader"].map((code,i)=>({id:"aaaaaaaa-0000-4000-8000-"+String([32,42,52,53][i]).padStart(12,"0"),code,description:"",active:true,revision:1}));
const users=[{id:id(),login:"sec01b-writer",displayName:"SEC-01B Tenant User Writer",active:true,revision:1},{id:id(),login:"sec01b4-delegator",displayName:"SEC-01B4 Scoped Role Delegator",active:true,revision:1},{id:id(),login:"demo-user",displayName:"Demo User",active:true,revision:1}];
const objects=[{id:id(),code:"demo-object-01",revision:1}];
let assignments:{id:string;userId:string;roleId:string;objectId:string|null;objectCode:string|null;revision:number}[]=users.slice(0,2).map((u,i)=>({id:id(),userId:u.id,roleId:roles[i+1].id,objectId:null,objectCode:null,revision:1}));
const company={id:id(),code:"mvp-a",name:"MVP A (demo)"};
const modules=[["core","Objects","Объекты"],["documents","Documents","Документы"],["fleet","Fleet","Флот"],["maintenance","Maintenance","Техническое обслуживание"],["crew","Crew","Экипаж"],["warehouse","Warehouse","Склад"],["finance","Finance","Финансы"],["analytics","Analytics","Аналитика"]].map(([code,nameEn,nameRu])=>({code,nameEn,nameRu,status:code==="core"?"available":"planned",enabled:code==="core"}));
let actor="",revision=1,session:{accessToken:string;refreshToken:string;sessionId:string}|null=null;
function issue(){session={accessToken:id(),refreshToken:id(),sessionId:session?.sessionId??id()};return reply(session);}
export async function demoFetch(path:string,init:RequestInit={}):Promise<Response>{
 const method=init.method??"GET",p=new URL(path,"https://demo.invalid").pathname.replace(/^\/api\/v1/,""),b=init.body?JSON.parse(String(init.body)):{};
 if(p==="/login"&&method==="POST"){session=null;actor="";if(b.company!=="mvp-a"||!["sec01b-writer","sec01b4-delegator"].includes(b.login)||b.password!=="demo-only")return fail(401);actor=b.login;return issue();}
 if(p==="/session/refresh"){if(!session||b.company!==company.code||b.sessionId!==session.sessionId||b.refreshToken!==session.refreshToken)return fail(401);return issue();}
 if(!session||new Headers(init.headers).get("Authorization")!=="Bearer "+session.accessToken)return fail(401);
 if(p==="/logout"){session=null;actor="";return reply(null,204);}
 if(p==="/company")return reply({company,modules});
 if(p==="/tenant/languages")return reply({primary:"en",languages:[{code:"en",name:"English",isPrimary:true,isEnabled:true,sortOrder:10},{code:"ru",name:"Russian",isPrimary:false,isEnabled:true,sortOrder:20}]});
 if(p==="/objects"&&method==="GET")return reply({items:objects});
 if(p.startsWith("/objects/")){const o=objects.find(x=>x.id===p.split("/").pop());return o?reply(o):fail(404);}
 const a=p.replace("/tenant-admin","");
 if(a==="/policy")return reply({revision});
 if(a==="/assignment-capabilities")return reply({canManage:actor==="sec01b4-delegator"});
 if(method==="GET"){if(a==="/users")return reply({items:users});if(a==="/roles")return reply({items:roles});if(a==="/assignments")return reply({items:assignments});}
 if(b.policyRevision!==revision)return fail(409);
 if(a==="/users"&&method==="POST"){if(actor!=="sec01b-writer")return fail(403);if(!/^[a-z][a-z0-9._-]{2,63}$/.test(b.login)||!b.displayName?.trim()||b.password?.length<12)return fail(400);if(users.some(u=>u.login===b.login))return fail(409);const u={id:id(),login:b.login,displayName:b.displayName,active:true,revision:1};users.push(u);return reply({...u,policyRevision:++revision},201);}
 if(a.startsWith("/users/")&&method==="PATCH"){if(actor!=="sec01b-writer")return fail(403);const u=users.find(x=>x.id===a.split("/").pop());if(!u)return fail(404);if(assignments.some(x=>x.userId===u.id))return fail(403);if(u.revision!==b.revision)return fail(409);if(typeof b.displayName==="string")u.displayName=b.displayName;if(typeof b.active==="boolean")u.active=b.active;u.revision++;return reply({...u,policyRevision:++revision});}
 if(a==="/assignments"&&method==="POST"){if(actor!=="sec01b4-delegator")return fail(403);const u=users.find(x=>x.id===b.userId),r=roles.find(x=>x.id===b.roleId),o=objects.find(x=>x.id===b.objectId);if(!u?.active||!r?.active||(b.objectId!==null&&!o))return fail(400);if(assignments.some(x=>x.userId===b.userId&&x.roleId===b.roleId&&x.objectId===b.objectId))return fail(409);assignments.push({id:id(),userId:b.userId,roleId:b.roleId,objectId:b.objectId,objectCode:o?.code??null,revision:1});return reply({revision:++revision},201);}
 if(a.startsWith("/assignments/")&&method==="DELETE"){if(actor!=="sec01b4-delegator")return fail(403);const x=assignments.find(x=>x.id===a.split("/").pop());if(!x)return fail(404);if(x.revision!==b.assignmentRevision)return fail(409);assignments=assignments.filter(y=>y!==x);return reply({revision:++revision});}
 return fail(404);
}
