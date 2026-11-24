/* Offline-only Platform API response fixtures. Never calls fetch. */
const id=()=>crypto.randomUUID(),now=()=>new Date().toISOString();
const json=(data:unknown,status=200)=>new Response(status===204?null:JSON.stringify(data),{status,headers:{"Content-Type":"application/json"}});
const fail=(status:number)=>json({},status);
const profile=()=>({legalName:"",tradeName:"",description:"",registrationNumber:"",taxNumber:"",countryCode:"",contactEmail:"",website:""});
type Company={tenantId:string;code:string;name:string;status:string;revision:number;profile:ReturnType<typeof profile>;activation?:{requestId:string;state:string}};
const companies:Company[]=[{tenantId:id(),code:"mvp-a",name:"MVP A (demo)",status:"active",revision:3,profile:profile()},{tenantId:id(),code:"mvp-b",name:"MVP B (demo)",status:"provisioning",revision:2,profile:profile()},{tenantId:id(),code:"demo-draft",name:"Draft (demo)",status:"draft",revision:1,profile:profile()}];
const ownerId=id(),reviewerId=id();let actor="",token="";
const ownerPermissions=["tenant.read","tenant.create","tenant.draft.update","tenant.activate","platform.reviewer.bootstrap","platform.mail.diagnose","platform.mail.test_send"];
type Review={requestId:string;tenantId:string;tenantCode:string;tenantName:string;requesterActorId:string;requesterLogin:string;expectedRevision:number;createdAt:string;canApprove:boolean};
const reviews:Review[]=[];const decisions:(Review&{decision:string;decidedAt:string;reason:string|null})[]=[];
const invitations:{requestId:string;reviewerLogin:string;recipientEmail:string;state:string;createdAt:string;confirmed?:boolean}[]=[];
let template={linkBaseURL:"https://example.test/central/reviewer/accept",subject:"Reviewer invitation",body:"Invitation",revision:1};
const logs:{at:string;category:string;eventType:string;outcome:string;subject:string}[]=[];
const log=(eventType:string,subject:string)=>logs.unshift({at:now(),category:"platform",eventType,outcome:"success",subject});
function page<T>(items:T[],q:URLSearchParams){const offset=Number(q.get("after")||0),limit=Number(q.get("limit")||20);return {items:items.slice(offset,offset+limit),nextCursor:offset+limit<items.length?String(offset+limit):""};}
export async function demoFetch(path:string,init:RequestInit={}):Promise<Response>{
 const u=new URL(path,"https://demo.invalid"),p=u.pathname.replace(/^\/api\/platform\/v1|^\/internal\/platform-admin/,""),q=u.searchParams,m=init.method??"GET",b=init.body?JSON.parse(String(init.body)):{};
 if(p==="/auth/login"){actor="";token="";if(!["owner.demo","reviewer.demo"].includes(b.loginName)||b.password!=="demo-only"||b.totp!=="000000")return fail(401);actor=b.loginName;return json(null,204);}
 if(p==="/auth/logout"){actor="";token="";return json(null,204);}
 if(p==="/reviewer/claim/readiness")return fail(503);
 if(p==="/reviewer/claim")return fail(503);
 if(!actor)return fail(401);
 if(p==="/auth/access"){token=id();return json({accessToken:token,tokenType:"Bearer",expiresIn:1800});}
 if(new Headers(init.headers).get("Authorization")!=="Bearer "+token)return fail(401);
 const reviewer=actor==="reviewer.demo",stepUp=(password:string,totp:string)=>password==="demo-only"&&totp==="000000";
 if(p==="/me")return json({actorId:reviewer?reviewerId:ownerId,login:actor,permissions:reviewer?["tenant.provision.approve"]:ownerPermissions});
 if(p.startsWith("/activation-reviews")){
  if(!reviewer)return fail(403);
  if(p==="/activation-reviews"){const a=page(reviews,q);return json({requests:a.items,nextCursor:a.nextCursor});}
  if(p==="/activation-reviews/history"){const a=page(decisions,q);return json({decisions:a.items,nextCursor:a.nextCursor});}
  const r=reviews.find(x=>x.requestId===p.split("/")[2]),c=companies.find(x=>x.tenantId===b.tenantId);
  if(!r||!c)return fail(404);if(!stepUp(b.password,b.totp))return fail(401);if(r.tenantId!==c.tenantId||c.revision!==b.expectedRevision||c.status!=="draft")return fail(409);
  const decision=p.endsWith("/approve")?"approved":"rejected";if(decision==="rejected"&&!b.reason?.trim())return fail(400);
  decisions.unshift({...r,decision,decidedAt:now(),reason:b.reason??null});reviews.splice(reviews.indexOf(r),1);if(c.activation)c.activation.state=decision;log(decision,c.code);return json({state:decision,requestId:r.requestId,tenantId:c.tenantId,reviewerActorId:reviewerId});
 }
 if(reviewer)return fail(403);
 if(p==="/companies"&&m==="GET"){const status=q.get("status"),a=page(companies.filter(x=>!status||status==="all"||x.status===status),q);return json({companies:a.items.map(({profile,activation,...x})=>x),nextCursor:a.nextCursor});}
 if(p==="/companies"&&m==="POST"){if(!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(b.code)||!b.name?.trim())return fail(400);if(companies.some(x=>x.code===b.code))return fail(409);const c={tenantId:id(),code:b.code,name:b.name,status:"draft",revision:1,profile:profile()};companies.push(c);log("company.created",c.code);return json({tenantId:c.tenantId,code:c.code,name:c.name,status:c.status,replayed:false},201);}
 if(p.startsWith("/companies/")){const c=companies.find(x=>x.tenantId===p.split("/")[2]);if(!c)return fail(404);
  if(p.endsWith("/activation-requests")){if(c.status!=="draft"||c.revision!==b.expectedRevision||c.activation?.state==="requested")return fail(409);c.activation={requestId:b.requestId,state:"requested"};reviews.push({requestId:b.requestId,tenantId:c.tenantId,tenantCode:c.code,tenantName:c.name,requesterActorId:ownerId,requesterLogin:"owner.demo",expectedRevision:c.revision,createdAt:now(),canApprove:true});return json({requestId:b.requestId,tenantId:c.tenantId,state:"requested",expectedRevision:c.revision,replayed:false},201);}
  if(p.endsWith("/provisioning/start")){if(!stepUp(b.ownerPassword,b.totp))return fail(401);if(c.activation?.state!=="approved")return fail(409);c.status="provisioning";c.revision++;return json({requestId:b.requestId,tenantId:c.tenantId,state:"accepted"},201);}
  if(p.endsWith("/provisioning"))return json({requestId:c.activation?.requestId??id(),tenantId:c.tenantId,code:c.code,state:c.status,databaseName:"demo_database",routeEnabled:false,routingEpoch:0,receipts:[]});
  if(m==="PATCH"){if(c.status!=="draft"||c.revision!==b.expectedRevision)return fail(409);if(typeof b.name==="string")c.name=b.name;for(const k of Object.keys(c.profile) as (keyof Company["profile"])[])if(typeof b[k]==="string")c.profile[k]=b[k];c.revision++;log("profile.update",c.code);}
  return json(c);
 }
 if(p==="/platform-logs"){const offset=Number(q.get("offset")||0),limit=Number(q.get("limit")||50);return json({events:logs.slice(offset,offset+limit),nextOffset:offset+limit<logs.length?offset+limit:null});}
 if(p==="/system/services")return json({at:now(),peers:{reviewer_claim:"not_configured",reviewer_email:"not_configured",mail_operator:"not_configured",c01_operator:"not_configured"}});
 if(p==="/reviewers/status")return json({activeReviewers:1,invitationEnabled:true});
 if(p==="/reviewers/invitations"&&m==="GET")return json({invitations});
 if(p==="/reviewers/invitations"&&m==="POST"){if(!stepUp(b.password,b.totp))return fail(401);if(!b.recipientEmail?.endsWith("@example.test"))return fail(400);invitations.push({requestId:b.requestId,reviewerLogin:b.reviewerLogin,recipientEmail:b.recipientEmail,state:"requested",createdAt:now()});return json({requestId:b.requestId,state:"requested",replayed:false},201);}
 if(p==="/reviewers/invitations/email/send")return fail(503);
 if(p==="/reviewers/invitations/owner-confirm")return fail(503);
 if(p.startsWith("/reviewers/invitations/")){const x=invitations.find(x=>x.requestId===p.split("/")[3]);if(!x)return fail(404);return p.endsWith("/owner-confirm")?json({requestId:x.requestId,state:x.confirmed?"confirmed":"pending"}):json(x);}
 if(p==="/reviewer/email/status")return json({configured:false,enabled:false});
 if(p==="/reviewer/email/password")return fail(503);
 if(p==="/reviewer/email/template"){if(m==="POST"){if(!stepUp(b.ownerPassword,b.totp))return fail(401);if(b.revision!==template.revision)return fail(409);template={linkBaseURL:b.linkBaseURL,subject:b.subject,body:b.body,revision:template.revision+1};}return json(template);}
 if(p==="/mail/settings")return json({host:"smtp.example.test",port:587,encryption:"starttls",tlsVerify:true,starttlsPort:587,imapPort:993,from:"noreply@example.test",ownerRecipient:"owner@example.test",reviewerRecipient:"reviewer@example.test",credentialsConfigured:false});
 if(p==="/mail/diagnostics"){if(!stepUp(b.password,b.totp))return fail(401);return json({requestId:b.requestId,action:b.action,recipient:b.recipient,status:"failed",stage:"unavailable",at:now()});}
 return fail(404);
}
