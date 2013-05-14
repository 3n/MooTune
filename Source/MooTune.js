/*
---

name: MooTune
script: MooTune.js
description: A MooTools class for logging events, errors and AB tests to multiple backends

requires: 
  - Core/Class.Extras
  - Core/Browser
  - More/Array.Extras
  - More/Hash.Cookie
  - More/String.QueryString
  - Core/Cookie

provides: [MooTune]

authors:
  - Ian Collins

...
*/

// todo 
// use cookie to ensure user is always on same test for session?
// add ability to force a test based on params?
// specify an array of backends per call to handleEvent
// per-event blocking of test inclusion
// overall test of logging when not all tests are running. fix issues with basic systems like google.
// send alert to event backend if something went wrong with a test (elem not found etc)
// add superproperties that get sent with all events

var MooTune = new Class({
  Implements: [Events, Options],
  
  options: {
    active: true,
    runOnInit: true,
    reportErrors: true,
    testAppliedClass: 'mooTuned',
    useUrlParams: true,
    tests: [],
    testsAtOnce: null,
    testsCookieName: 'MooTuneTests',
    testSchema: {
      name: '',
      description: '',
      type: 'class',
      sampleSize: 1,
      alwaysRun: false,
      persist: false,
      versions: []      

      // 'index'  - persist the index of the version chosen to the cookie
      // 'string' - persist the version string to the cookie
      // versionStore: 'index',

      // onSelected: function
      // pickVersion: function
      // shouldRun: function
    },
    
    eventSchema: {
      name: '',
      info: {
        category: '',
        description: ''
      },
      options: {}
    },
    getEventDefaults: function(){
      return {
        info: {
          pageUrl: document.URL,
          time: new Date().getTime(),
          userAgent: navigator.userAgent,
          platform: Browser.Platform.name,
          browser: Browser.name,
          referrer: document.referrer
        }
      };
    },
    cookieName: '_MooTune_ID',
    cookieDurationInDays: 365,
    generateId: function(){
      return Math.random() * 10000000000000000;
    },
    getIdentity: function(){
      var currentId = Cookie.read(this.options.cookieName);
      if (currentId) return currentId;
      
      this.newIdentity = true;
      
      var newId = this.options.generateId.call(this);
      Cookie.write(this.options.cookieName, newId, {duration: this.options.cookieDurationInDays});
      return newId;
    }
  },
  
  eventsLog: [],
  active: false,
  
  initialize: function(options){
    this.setOptions(options);
    
    if (this.options.active) this.activate();
    
    this.detectBackends();    
    this.attach();
    
    this.tests = this.options.testsAtOnce == null 
                  ? this.options.tests 
                  : this.options.tests.shuffle();
    
    if (this.options.useUrlParams)
      this.urlParams = document.location.search.slice(1).parseQueryString();
                  
    if (this.options.runOnInit) this.runTests();
    
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
      window.onerror = this.handleError.bind(this);

    return this;
  },
  
  activate: function(){ this.active = true; },
  deactivate: function(){ this.active = false; },
  
  runTests: function(){
    if (this.options.testsAtOnce == null)
      this.options.testsAtOnce = this.tests.length;
    
    this.options.testsAtOnce.times(function(i){
      this.tests[i] = this.runTest(this.tests[i]);
    }, this);
    
    this.tests.filter(function(item){
      return item.alwaysRun && !item.running;
    }).each(function(test){
      this.runTest(test);
    }, this);
  },
  runTest: function(test){
    if (!test.running)
      test = Object.merge({}, this.options.testSchema, test);
      
    if (!( Math.random() < test.sampleSize ))
      return this;
    
    if (test.shouldRun && !test.shouldRun.call(test, this)) return test;
    
    var version = this.getTestVersion(test);
    test.selectedVersion = version;
    
    Object.each(this.backends, function(backend, name){
      if (backend.sendTestsAsEvents && this.active)
        backend.handleEvent({
          name: '(Test) ' + test.name + ' / ' + version,
          info: {
            category: 'Test',
            description: test.description
          }
        });
    }, this);
    
    var elem = $$(test.element);
    
    switch(test.type){
      case 'class':
        elem.addClass(version);
        break;
      default:
        elem.set(test.type, version);
        break;
    }    
    elem.addClass(this.options.testAppliedClass);
  
    test.running = true;
    
    if (test.onSelected) test.onSelected(version, this);
    this.fireEvent('testRunning', [test, this]);

    return test;
  },
  getTestVersion: function(test){
    if (this.options.useUrlParams && this.urlParams[test.name] !== undefined){
      var paramName = this.urlParams[test.name],
          num = paramName.toInt();
      if (!isNaN(num)) return test.versions[num];
      else return paramName;
    } else if (test.persist){
      // create a cookie to persist into if it doesn't already exist
      this.testCookieStore = this.testCookieStore ||
        new Hash.Cookie(this.options.testsCookieName, {duration: 100});

      // get any previously stored version of this test
      var stored = this.testCookieStore.get(test.name);

      // if a previous version was stored, use that
      if (stored != undefined) {
        return test.versionStore === 'string' ?
          // if the test versionStore is 'string', just return that version.
          // otherwise, index it
          stored : test.versions[stored];
      }
      // otherwise, choose a different version at random
      else {
        var randomIndex = Math.floor(Math.random() * (test.versions.length));

        // if the versionStore is 'string', persist the version name.
        // otherwise, persist the index
        this.testCookieStore.set(
          test.name,
          test.versionStore === 'string' ? test.versions[randomIndex] : randomIndex
        );

        return test.versions[randomIndex];
      }
    } else if (test.pickVersion){
      var pickedVersion = test.pickVersion();
      if (pickedVersion) return pickedVersion;
    }
    return test.versions.getRandom();
  },
  
  getRunningTests: function(){
    return this.tests.filter(function(test){
      return test.running;
    });
  },
  
  handleError: function(msg, url, linenumber){
    var error = {      
      name: 'Javascript Error',
      info: {
        category: 'Error',
        description: msg,
        url: url,
        linenumber: linenumber
      }
    };
    
    this.fireEvent('error', [error, this]);
    return this.handleEvent(error);
  },
  
  handleEvent: function(event, info, options){
    if (!this.active) return this;
    if (typeOf(event) == 'string') var event = { name: event };
    if (typeOf(info) == 'object') event.info = info;
    if (typeOf(options) == 'object') event.options = options;
    
    var eventWithDefaults = this.options.getEventDefaults();
        
    Object.merge(eventWithDefaults, this.options.eventSchema, event);
        
    if (eventWithDefaults.options.ignoreDuplicates 
        && this.eventsLog.some(function(e){ return e.name === eventWithDefaults.name; }))
      return this;
    
    Object.each(this.backends, function(backend, name){
      if (backend.sendTestsWithEvents){
        var eventWithTests = { info: {} };
        this.tests.each(function(test){
          eventWithTests['info']['(Test) ' + test.name] = test.running ? test.selectedVersion : 'not running';
        });
        
        Object.merge(eventWithTests, eventWithDefaults);
        backend.handleEvent(eventWithTests);
      } else
        backend.handleEvent(eventWithDefaults);

      this.fireEvent('eventSentToBackend', [name, backend, this]);
    }, this);
    
    this.eventsLog.push(eventWithDefaults);
    this.fireEvent('eventComplete', [eventWithDefaults, this]);
    
    return this;
  },
  
  identify: function(id) {
    Object.each(this.backends, function(backend) {
      if (backend['identify']) backend.identify(id || this.options.getIdentity.call(this));
    }, this);
    return this;
  }
  
});

MooTune.Backends = {
  'GoogleAnalytics': {
    sendTestsAsEvents: true,
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
    sendTestsWithEvents: true,
    serviceAvailable: function(){
      return typeof(mpmetrics) != 'undefined' || typeof(mpq) != 'undefined';
    },
    handleEvent: function(event){
      if (typeof(mpmetrics) == 'object')
        mpmetrics.track(event.name, event.info);
      else if (typeof(mpq) == 'object')
        mpq.push(['track', event.name, event.info]);
    },
    identify: function(userId) {
      if (typeof(mpmetrics) == 'object') mpmetrics.identify(userId);
      if (typeof(mpq) == 'object') mpq.push(['name_tag', userId]);
    }
  },
  'KISSMetrics': {
    sendTestsWithEvents: true,
    serviceAvailable: function() {
      return typeof(_kmq) != 'undefined';
    },
    handleEvent: function(event) {
      if (typeof(_kmq) == 'object') { _kmq.push(['record', event.name, event.info]); }
    },
    identify: function(userId) {
      if (typeof(_kmq) == 'object') {
        if (typeof(KM) == 'object') {
          // so Kissmetrics has two methods, alias and identify.
          // if we've ID'd this person before, lets just alias
          // them to our old ID, which is stored in KM._i .          
          if (KM.__myID__) {
            _kmq.push(['alias', userId, KM._i]);
            return;
          }          
        }
        // this calls the identify function, and as a
        // callback it sets a __myID__ prop signifying
        // that we've done our own ID'ing with Kissm.
        _kmq.push(['identify', userId],
                  function(){ KM.__myID__ = true; });
      }
    }
  }
  /*,
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
