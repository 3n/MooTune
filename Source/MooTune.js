/*
---

name: app
script: app.js
description: app.js for BankSimple.com static marketing site

requires: 
  - Core/Core

provides: [MooTune]

...
*/

window.onerror = function(msg, url, linenumber){ 
	var handle_error = function(msg, url, linenumber) {
		new Request({ url: GLOBALZ.path_prefix + '/js_error' }).get({
			msg        : msg,
			script_url : url,
			line_num   : linenumber,
			page_url   : document.URL,
			time       : new Date().getTime()
		});

		if (!$('error-message') && !GLOBALZ.kumo){
			var tmp = new Element('div', {
				'html'  : 'An <span class="error-red">error</span> has occured on this page and was logged. Please try refreshing if things aren\'t working',
				'id'    : 'error-message',
				'events': {
					'click' : function(){ this.destroy() }
				}
			}).inject($(document.body));

			(function(){
				tmp.f4de('out', 500, function(){ this.element.destroy() });
			}).delay(6000);
		}
	}

	if (GLOBALZ.dom_ready) handle_error(msg, url, linenumber);
	else									 window.addEvent('domready', handle_error.bind(window, [msg, url, linenumber]));
}



// 


var FeatureUseTracker = new Class({
  initialize: function(){
    this.session_id = MD5(navigator.userAgent + new Date());
    this.sent = [];
    
    this.sendAction = function(message, data, opts){
      var opts = opts || {};
      if (opts.duplicates == true || !this.sent.contains(message)){
    		new Request({ url: GLOBALZ.path_prefix + '/js_analytics' }).get({
    		  data: $H({
      		  session_id : this.session_id,
      		  msg        : message || '',
      		  extra_data : data || {},		  
      		  time       : new Date().getTime(),
      		  page_url   : document.URL
    		  }).toJSON()
    		});
  		}
  		this.sent.include(message);      
    }.create({delay: 1, bind: this});
    
    this.sendAction('session start');
    
    return this;
  }
});

// GLOBALZ.tracker.sendAction('user highlights present on load',{count: this.user_highlighted_elems.length});