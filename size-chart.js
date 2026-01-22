
(function(){
  if(window.__SC__) return;
  window.__SC__ = true;
  
  var API = 'https://script.google.com/macros/s/AKfycbzQ-TYAu3HxSEktr2d7b1dy1c11BhvC3Qfkp12R-wYgXofnap2hLS6yiypsj6yNhPan/exec';
  var CACHE_TIME = 3600000;
  
  function getProductId(){
    var el = document.querySelector('product-price[product-id]');
    return el ? el.getAttribute('product-id') : null;
  }
  
	function init(){
	  var id = getProductId();
	  var btn = document.getElementById('sc-btn');
	  
	  if(!btn) {
		return;
	  }
	  
	  if(!id) {
		btn.style.display = 'none';
		return;
	  }
	  
	  
	  // Sprawdź czy produkt ma tabelę
	  checkAndShowButton(id, btn);
	}
  
  function createModal(){
    var modal = document.createElement('div');
    modal.id = 'sc-modal';
    modal.innerHTML = '<div class="sc-bg"></div><div class="sc-box"><div class="sc-head"><span>Tabela rozmiarów</span><button class="sc-close">✕</button></div><div class="sc-body" id="sc-content">Ładowanie...</div></div>';
    document.body.appendChild(modal);
    
    modal.querySelector('.sc-bg').onclick = closeModal;
    modal.querySelector('.sc-close').onclick = closeModal;
  }
  
  function openModal(id){
    var modal = document.getElementById('sc-modal');
    if(!modal) {
      createModal();
      modal = document.getElementById('sc-modal');
    }
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
    loadData(id);
  }
  
  function closeModal(){
    var modal = document.getElementById('sc-modal');
    if(modal) modal.classList.remove('open');
    document.body.style.overflow = '';
  }
  
	function checkAndShowButton(id, btn){
	  var cache = localStorage.getItem('sc-check-' + id);
	  if(cache){
		try {
		  var c = JSON.parse(cache);
		  if(Date.now() - c.ts < CACHE_TIME){
			btn.style.display = c.hasTable ? 'block' : 'none';
			if(c.hasTable){
			  btn.onclick = function(){ openModal(id); };
			  if(!document.getElementById('sc-modal')) createModal();
			}
			return;
		  }
		} catch(e){}
	  }
	  
	  // Sprawdź w API
	  fetch(API + '?id=' + id)
		.then(function(r){ return r.json(); })
		.then(function(data){
		  var hasTable = !data.error;
		  
		  // Zapisz w cache
		  localStorage.setItem('sc-check-' + id, JSON.stringify({ 
			ts: Date.now(), 
			hasTable: hasTable 
		  }));
		  
		  if(hasTable){
			// Zapisz też dane tabeli żeby nie pobierać drugi raz przy otwarciu
			localStorage.setItem('sc-' + id, JSON.stringify({ 
			  ts: Date.now(), 
			  data: data 
			}));
			
			btn.style.display = 'block';
			btn.onclick = function(){ openModal(id); };
			if(!document.getElementById('sc-modal')) createModal();
		  } else {
			btn.style.display = 'none';
		  }
		})
		.catch(function(){
		  btn.style.display = 'none';
		});
	}  
	  
  function loadData(id){
    var cont = document.getElementById('sc-content');
    if(!cont) return;
    
    cont.innerHTML = 'Ładowanie...';
    
    var cache = localStorage.getItem('sc-' + id);
    if(cache){
      try {
        var c = JSON.parse(cache);
        if(Date.now() - c.ts < CACHE_TIME){
          cont.innerHTML = buildTable(c.data);
          return;
        }
      } catch(e){}
    }
    
    fetch(API + '?id=' + id)
      .then(function(r){ return r.json(); })
      .then(function(data){
        if(data.error){
          cont.innerHTML = '<p>Brak tabeli rozmiarów dla tego produktu.</p>';
        } else {
          localStorage.setItem('sc-' + id, JSON.stringify({ ts: Date.now(), data: data }));
          cont.innerHTML = buildTable(data);
        }
      })
      .catch(function(err){
        console.error('📏 Błąd:', err);
        cont.innerHTML = '<p>Błąd ładowania.</p>';
      });
  }
  
  function buildTable(data){
    var h = '<table><thead><tr>';
    for(var i=0; i<data.headers.length; i++) h += '<th>' + data.headers[i] + '</th>';
    h += '</tr></thead><tbody>';
    for(var r=0; r<data.rows.length; r++){
      h += '<tr>';
      for(var c=0; c<data.rows[r].length; c++){
        h += (c===0 ? '<th>' : '<td>') + data.rows[r][c] + (c===0 ? '</th>' : '</td>');
      }
      h += '</tr>';
    }
    h += '</tbody></table>';
    return h;
  }
  
  // Pierwsze uruchomienie
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
  // ========== CZEKAMY NA useStorefront ==========
  function setupEventBus(){
    
    if(typeof useStorefront !== 'function'){
      return false;
    }
    
    
    useStorefront(async function(storefront){
      
      storefront.eventBus.on('PageManager.rendered', function(){
        setTimeout(init, 300);
      });
      
      
    });
    
    return true;
  }
  
  // Próbuj co 100ms przez maksymalnie 5 sekund
  var attempts = 0;
  var maxAttempts = 50;
  
  var interval = setInterval(function(){
    attempts++;
    
    if(setupEventBus()){
      clearInterval(interval);
    } else if(attempts >= maxAttempts){
      clearInterval(interval);
    }
  }, 100);
  
})();