MooTune
=======

A MooTools class for logging events, errors and AB tests to multiple backends such as Google Analytics,
Mixpanel or your own server logs. It can be used to gain insights into the actions your user's take
on your site, the errors they encounter and the affect of variations on the site with their 
interactions.

_Note: this is an alpha release with functionality that matches my needs and hopefully a few other
people. We're using it on banksimple.com and it's great, but you may need to modify it to your
tastes. Mixpanel is highly recommended, especially over Google Analytics, since the event tracking
there is a wasteland._

![Screenshot](http://idisk.me.com/iancollins/Public/Pictures/Skitch/guilloche_platform-20101201-145404.png)

How to use
----------

1. Setup the tracking scripts for the backend services you'd like to use (e.g Google Analytics,
   Mixpanel). Asynchronous scripts should work fine, so use them.
2. Create a backend if you're using your own server or a service other than the ones mentioned.
3. Somewhere very early in your application's javascript, create an instance of MooTune (after 
   domready if you have tests that modify elements).
4. When something happens that you'd like to track, call handleEvent on your instance and pass
   it an event name and a dictionary/map/object of info.
5. Enjoy your sweet, sweet data.


Events
------

Once you create an instance of MooTune, you can add calls to myMooTune.handleEvent(obj) in your code
wherever something happens that you'd like to log to your backend(s). For each call to handleEvent, 
MooTune will send the appropriate call to all of the backends you have specified. The event obj looks
like this:

	{ name: 'Name of Event',
		info: {
			category: 'Optional Category',
			description: 'Optional Description',
			anything: 'else you want',
			is: 'fine'
		},
		options: {
			ignoreDuplicates: true // ignore this event after it's been seen once (defaults to false)
		}
	}

The key/value pairs inside info are entirely up to you, but only 'category', 'value' and 'description' 
will be sent if you are using Google Analytics. If you are using Mixpanel or your own server the 
whole hash will be sent along with the event's name.


Errors
------

All errors logged via window.onerror will be sent as events with the following information:

	name: 'error message',
	info: {
		category: 'Error',
		url: 'http://current.url',
		linenumber: 15
	}


Backends
--------

When instantiating MooTune you can either pass in an array of Backends, or let it discover and use
whatever you have available. A Backend is an object that looks like this:

	'Name': {
		sendTestsAsEvents: <boolean>, // see below
		sendTestsWithEvents: <boolean>, // see below
		serviceAvailable: function(){
			// returns true if service can be used (e.g. tracker code installed)
		},
		handleEvent: function(event){
			// is passed an event and relays it to correct tracker/analytics service
		}
	}
	
* sendTestsAsEvents - When each test is selected to run it is sent as an event with the form:
	(Test) Name-of-test / selected-value. Use this option for backend systems that do not allow for
	arbitrary key/value properties to be sent with events.
* sendTestsWithEvents - Each time an event is fired, a hash containing all of the your tests will
	be included, in the form { test-name: selected-value }. 
	If the test is not running, the value of the pair will be replaced with 'not running.'


A/B & Multivariate Testing
--------------------------

MooTune supports a simple method for doing A/B (split) testing. Actually, it's multivariate (as many
options as you want). When instantiating MooTune, pass in an array of tests. Tests are objects 
(surprise) that look like this:
	
	{ name: 'Test Name',
	  description: 'Optional Description',
	  element: '#css .selector' // a css selector to get the element(s)
	  type: 'class', // what to set on the element(s) (class, text, html etc)
	  sampleSize: 1, // float between 0 and 1 for percentage of users to test
	  alwaysRun: false, // overrides the MooTune option for number of tests to run
		persist: false, // stores test choice in cookie to persist across user's sessions
		pickVersion: function(){ return test.versions[0]; }, // forces first version every time
	  versions: [
	    'some',
	    'values',
	    'to',
	    'test out'
	  ],
	  onSelected: function(selectedVersion){} // a function that is called when the test is used
	}

When a MooTune instance is created with a set of tests, it first determines (based on your options)
how many of the tests to run. 

It then runs those tests, which can mean one of two things, depending on the options set for the
backend recieving the data:

1. sendTestsAsEvents:true - Test triggers an event that can be tracked against all other events.
   Using this method, you can compare the number of times a test event fired vs. a conversion
   event. If your analytics backend provides funnels, use them.
2. sendTestsWithEvents:true - Nothing at this point, but when any other event fires, all your tests
   will be included as properties. This allows you to drill down into an event (e.g. Signup) and 
   see the success ratio of each test's option.
	
After one (or both) of those options is complete, the element itself is modified in the way you
specified, using the value selected at random.


MooTune Method: constructor
---------------------------

	var mt = new MooTune(options);

#### Options

* active - (boolean: defaults to true) Whether or not to fire events passed to handleEvent.
* reportErrors - (boolean: defaults to true) Send Javascript errors to the Backend(s).
* tests - (array: defaults to []) Array of test objects.
* testsAtOnce - (int: defaults to null) How many tests from the tests array to run. Null means all.
						    if you specify a number N, the tests array will be shuffled and the first N will be
								ran. All other tests will be ignored for this session, unless they have the alwaysRun
								flag turned on.
* testSchema - (object) The schema and defaults of the test object.
* eventSchema - (object) The schema and defaults of the event object.
* testAppliedClass - (string: defaults to 'mooTuned') class to add to test-modified element.
* useUrlParams - (boolean: defaults to true) parses the parameters in document.location.search and uses any testName/testVersion pairs to statically pick a test version. If the testVersion is a number, it will use that as an index into the versions array.

#### Events

* testRunning - When a test is selected and runs. Arguments: test object and this.
* error - When a Javascript error happens. Arguments: error event object and this.
* testRunning - When a test is selected and runs. Arguments: test object and this.
* eventSentToBackend - The event was sent to a backend. Arguments: name of the backend, the backend object and this.
* eventComplete - The event was handled completely. Arguments: event object and this.


MooTune Method: handleEvent
---------------------------

#### Syntax

	mt.handleEvent(event);
	
#### Arguments

1. event - event object (details above).

#### Returns

Instance of MooTune (for chaining).

#### Example

	var mt = new MooTune({
		
    tests: [
		  { name: 'Header Signup Button Text',
		    description: 'Change the text of the button in the header that scrolls down to the form.',
		    type: 'text',
		    element: '#header-sign-up',
		    versions: [
		      'Get on the beta list',
		      'Save your spot',
		      'Sign up for an invite'
		    ]
		  },
		  { name: 'Header Signup Button Color',
		    description: 'Change the color of the button in the header that scrolls down to the form.',
		    type: 'class',
		    element: '#header-sign-up',
		    versions: [
		      'blue',
		      'green'
		    ]
		  },

		  { name: 'Headline Text',
		    type: 'text',
		    element: '#headline',
		    versions: [
		      'Banking shouldn’t be hard.',
		      'Isn’t it time for simple banking?',
		      'Banking that treats you like a person.',
		      'We’re not a bank. We’re better.'
		    ]
		  }
		],
    onEventComplete: function(e){
      console.log('event complete ' + e.name, e);
    }

	});

Screenshots
-----------

_Events on Mixpanel:_  
![Events on Mixpanel](http://idisk.me.com/iancollins/Public/Pictures/Skitch/stats-20101201-145139.png)

_Random Test Distribution:_  
![Random Distribution](http://idisk.me.com/iancollins/Public/Pictures/Skitch/test_distro-20101201-145052.png)

_Which Sections are the Most Read?:_  
![Sections Read](http://idisk.me.com/iancollins/Public/Pictures/Skitch/sections_read-20101201-145319.png)

_Guilloche Renders Per Platform:_  
![Guilloche Platform](http://idisk.me.com/iancollins/Public/Pictures/Skitch/guilloche_platform-20101201-145404.png)

_An A/B Test's Results:_  
![A/B Test](http://idisk.me.com/iancollins/Public/Pictures/Skitch/ab_test-20101201-145504.png)

_Example Funnel:_  
![Funnel](http://idisk.me.com/iancollins/Public/Pictures/Skitch/BankSimple_Static_Jekyll___Funnel_%28Guilloche_Rendered%29_-_Mixpanel_%7C_Real-time_Web_Analytics%2C_Funnel_Analysis-20101201-145727.png)
