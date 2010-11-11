Overview
========

A MooTools class for logging events, errors and AB tests to multiple backends such as Google Analytics,
Mixpanel or your own server logs. It can be used to gain insights into the actions your user's take
on your site, the errors they encounter and the affect of variations on the site with their 
interactions. Let's go over some core concepts:


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
		serviceAvailable: function(){
			// returns true if service can be used (e.g. tracker code installed)
		},
		handleEvent: function(event){
			// is passed an event and relays it to correct tracker/analytics service
		}
	}


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
	  versions: [
	    'some',
	    'values',
	    'to',
	    'test out'
	  ],
	  onSelected: function(selectedVersion){} // a function that is called when the test is used
	}

When a MooTune instance is created with a set of tests, it first determines (based on your options)
how many of the tests to run. It then runs those tests, which just means firing an event with the 
name of the test and the version selected, then modifying the specified element. Then in your 
analytics service you can compare the test events vs. whatever event you want to measure
against (e.g. "User Signed Up"). It is as simple as that. The best way I've found to use this data
is by creating flows for each test on Mixpanel.com. Do it.


Class Documentation
===================

	var mt = new MooTune(options);

Options
-------

* reportErrors - (boolean: defaults to true) Send Javascript errors to the Backend(s).
* tests - (array: defaults to []) Array of test objects.
* testsAtOnce - (int: defaults to null) Number of tests to run. Null means all.
* testSchema - (object) The schema and defaults of the test object.
* eventSchema - (object) The schema and defaults of the event object.

Events
------

* testRunning - When a test is selected and runs. Arguments: test object and this.
* error - When a Javascript error happens. Arguments: error event object and this.
* testRunning - When a test is selected and runs. Arguments: test object and this.
* eventSentToBackend - The event was sent to a backend. Arguments: name of the backend, the backend object and this.
* eventComplete - The event was handled completely. Arguments: event object and this.

Method: handleEvent
===================

Syntax
------

	mt.handleEvent(event);
	
Arguments
---------

1. event - event object (details above).

Returns
-------

Instance of MooTune (for chaining).

Example
=======

	var mt = new MooTune({
		
    tests: [
		  { name: 'Header Signup Button Text',
		    description: 'Change the text of the button in the header that scrolls down to the form.',
		    type: 'text',
		    element: 'header-sign-up',
		    versions: [
		      'Get on the beta list',
		      'Save your spot',
		      'Sign up for an invite'
		    ]
		  },
		  { name: 'Header Signup Button Color',
		    description: 'Change the color of the button in the header that scrolls down to the form.',
		    type: 'class',
		    element: 'header-sign-up',
		    versions: [
		      'blue',
		      'green'
		    ]
		  },

		  { name: 'Headline Text',
		    type: 'text',
		    element: 'headline',
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









