(function(){'use strict';
  const form=document.getElementById('login-form');
  form.addEventListener('submit',function(event){
    event.preventDefault();
    const role=new FormData(form).get('demo-role');
    // UI navigation only. Never read, store, or transmit credentials from the demo form.
    location.href=role==='tenant'?'../tenant/index.html':'../platform/index.html';
  });
})();
