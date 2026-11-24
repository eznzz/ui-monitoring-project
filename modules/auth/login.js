(function(){'use strict';
const form=document.getElementById('login-form'),company=document.getElementById('login-company'),state=MP.state();
state.companies.forEach(c=>company.add(new Option(c.name+' · '+(c.vdmsCode||c.id),c.id)));
function sync(){const tenant=form.querySelector('[name="demo-role"]:checked').value==='tenant';document.getElementById('login-company-field').hidden=!tenant;document.getElementById('login-totp-field').hidden=tenant;company.disabled=!tenant;document.getElementById('login-totp').disabled=tenant;}
if(new URLSearchParams(location.search).get('workspace')==='tenant')form.querySelector('[name="demo-role"][value="tenant"]').checked=true;
form.querySelectorAll('[name="demo-role"]').forEach(x=>x.addEventListener('change',sync));sync();
form.addEventListener('submit',event=>{event.preventDefault();const tenant=form.querySelector('[name="demo-role"]:checked').value==='tenant';const target=tenant?'../tenant/index.html?tenant='+encodeURIComponent(company.value):'../platform/contract-demo/index.html#login';form.reset();location.href=target;});
})();
