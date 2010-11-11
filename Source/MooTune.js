/*
---

name: app
script: app.js
description: app.js for BankSimple.com static marketing site

requires: 
  - More/Array.Extras
  - Core/Class.Extras

provides: [MooTune]

...
*/

// todo 
// use cookie to ensure user is always on same test for session?

var MooTune = new Class({
  Implements: [Events, Options],
  
  options: {
    reportErrors: true,
    
    tests: [],
    testsAtOnce: null,
    testSchema: {
      name: '',
      description: '',
      type: 'class',
      sampleSize: 1,
      alwaysRun: false,
      versions: []
      // onSelected: function(){}
    },
    
    eventSchema: {
      name: '',
      info: {
        category: '',
        description: ''
      },
      options: {}
    }
  },
  
  eventsLog: [],
  
  initialize: function(options){
    this.setOptions(options);
    
    this.detectBackends();    
    this.attach();
    
    this.tests = this.options.testsAtOnce == null 
                  ? this.options.tests 
                  : this.options.tests.shuffle();
                  
    this.runTests();
    
    return this;
  },
  
  detectBackends: function(){
    this.backends = this.options.backends || Object.filter(MooTune.Backends, function(value, key){
      return value.serviceAvailable();
    });
    
    return this;
  },
  
  attach: function(){
    if (this.options.reportErrors)
      window.onerror = this.handleError;

    return this;
  },
  
  runTests: function(){
    if (this.options.testsAtOnce == null)
      this.options.testsAtOnce = this.tests.length;
    
    this.options.testsAtOnce.times(function(i){
      this.runTest(this.tests[i]);
    }, this);
    
    this.tests.filter(function(item){ return item.alwaysRun && !item.running; }).each(function(test){
      this.runTest(test);
    }, this);
  },
  runTest: function(test){
    if (!test.running)
      test = Object.merge({}, this.options.testSchema, test);
      
    if (!( Math.random() < test.sampleSize ))
      return this;
    
    var version = test.versions.getRandom();
    
    this.handleEvent({
      name: '(Test) ' + test.name + ' / ' + version,
      info: {
        category: 'Test',
        description: test.description
      }
    });
    
    $(test.element).set(test.type, version);    
    test.running = true;
    
    if (test.onSelected) test.onSelected(version, this);
    this.fireEvent('testRunning', [test, this]);
    return this;
  },
  
  handleError: function(msg, url, linenumber){
    var error = {      
      name: msg,
      info: {
        category: 'Error',
        url: url,
        linenumber: linenumber
      }
    };
    
    this.fireEvent('error', [error, this]);
    return this.handleEvent(error);
  },
  
  handleEvent: function(event){
    var eventWithDefaults = {
          info: {
            pageUrl: document.URL,
            time: new Date().getTime(),
            userAgent: navigator.userAgent
          }
        };
        
    Object.merge(eventWithDefaults, this.options.eventSchema, event);
        
    if (eventWithDefaults.options.ignoreDuplicates 
        && this.eventsLog.some(function(e){ return e.name === eventWithDefaults.name; }))
      return this;
    
    Object.each(this.backends, function(backend, name){
      backend.handleEvent(eventWithDefaults);
      this.fireEvent('eventSentToBackend', [name, backend, this]);
    }, this);
    
    this.eventsLog.push(eventWithDefaults);
    this.fireEvent('eventComplete', [eventWithDefaults, this]);
    
    return this;
  }
});

MooTune.Backends = {
  'GoogleAnalytics': {
    serviceAvailable: function(){
      return typeof(pageTracker) == "object" || typeof(_gaq) == "object";
    },
    handleEvent: function(event){
      if (typeof(pageTracker) == "object") 
        pageTracker._trackEvent(event.info.category, event.name, event.info.description, event.info.value);
      else if (typeof(_gaq) == "object") 
        _gaq.push(['_trackEvent', event.info.category, event.name, event.info.description, event.info.value]);
    }
  },
  'Mixpanel': {
    serviceAvailable: function(){
      return typeof(mpmetrics) != 'undefined';
    },
    handleEvent: function(event){
      mpmetrics.track(event.name, event.info);
    }
  }/*,
  'Basic': {
    serviceAvailable: function(){
      return false;
    },
    handleEvent: function(event){
      new Request({ url: '/jsEvent' }).get({
        name: event.name,
        info: event.info
      });
    }
  }*/
};