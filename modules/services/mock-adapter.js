/* Thin, synchronous mock data adapter for the static GitHub Pages demo.
   NOT an HTTP API client. Future VDMS adapter must be async and return
   server-authorized principal, scopes, subscriptions and object data. */
(function(){
'use strict';
window.MP_DATA={
 mode:'mock',
 load:()=>MP.state(),
 persist:state=>MP.save(state),
 company:(state,companyId)=>MP.company(state,companyId),
 tenant:(state,companyId)=>MP.tenant(state,companyId),
 objects:(state,companyId)=>MP.tenant(state,companyId).objects
};
})();
