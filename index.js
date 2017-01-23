/* eslint-disable  func-names */
/* eslint quote-props: ["error", "consistent"]*/

'use strict';

const Alexa = require('alexa-sdk');
const http = require('http');

var output = "";

const languageStrings = {
    'en-US': {
        translation: {
            SKILL_NAME: 'Check The T',
            HELP_MESSAGE: 'Check when the next T is coming',
            HELP_REPROMPT: 'What can I help you with?',
            STOP_MESSAGE: 'Goodbye!'
        }
    }
};

const handlers = {
    'LaunchRequest': function () {
        this.emit('CheckSavedRoutes');
    },
    'CheckSavedRoutesIntent': function () {
        this.emit('CheckSavedRoutes');
    },
    'CheckSavedRoutes': function () {
        const alexa = this;
        
        httpGet(function (response) {
            // Parse the response into a JSON object ready to be formatted.
            var responseData = JSON.parse(response);
            var cardContent = "Data provided by MBTA Real-Time API\n\n";

            // Check if we have correct data, If not create an error speech out to try again.
            if (responseData === null) {
                output = "There was a problem with getting data please try again";
            }
            else {
                output = responseData.stop_name + '. ';
                
                if(!responseData.mode) {
                    output += 'No routes are currently scheduled';
                } else {
                    for(let mode of responseData.mode) {
                        for(let route of mode.route) {
                            for(let direction of route.direction) {
                                if(direction.direction_id === '1') {
                                    for (let trip of direction.trip) {
                                        const diff = formatTimeDiff(trip.pre_dt);
                                        output += 'route ' + route.route_id + ' ' + mode.mode_name + '. To ' + trip.trip_headsign + '. Is coming ' + diff;
                                    }
                                }
                            }
                        }
                    }
                }
            }

            alexa.emit(':tellWithCard', output, alexa.t('SKILL_NAME'), cardContent);
        });
    },
    'AMAZON.HelpIntent': function () {
        const speechOutput = this.t('HELP_MESSAGE');
        const reprompt = this.t('HELP_MESSAGE');
        this.emit(':ask', speechOutput, reprompt);
    },
    'AMAZON.CancelIntent': function () {
        this.emit(':tell', this.t('STOP_MESSAGE'));
    },
    'AMAZON.StopIntent': function () {
        this.emit(':tell', this.t('STOP_MESSAGE'));
    },
    'SessionEndedRequest': function () {
        this.emit(':tell', this.t('STOP_MESSAGE'));
    }
};

exports.handler = (event, context) => {
    const alexa = Alexa.handler(event, context);
    
    // To enable string internationalization (i18n) features, set a resources object.
    alexa.resources = languageStrings;
    alexa.registerHandlers(handlers);
    alexa.execute();
};

function formatTimeDiff(date) {
    var delta = Math.round(date - (+new Date / 1000));
    var absDelta = Math.abs(delta);

    var minute = 60,
        hour = minute * 60,
        day = hour * 24,
        week = day * 7;

    var fuzzy;

    if (absDelta < 2 * minute) {
        fuzzy = 'now'
    } else if (absDelta < hour) {
        fuzzy = Math.floor(absDelta / minute) + ' minutes';
    } else if (Math.floor(absDelta / hour) == 1) {
        fuzzy = 'an hour'
    } else {
        fuzzy = Math.floor(absDelta / hour) + ' hours';
    }
    
    if(delta > 0) {
        return 'in ' + fuzzy + '.';
    } else {
        return fuzzy + ' ago.';
    }
}

// Create a web request and handle the response.
function httpGet(callback) {
    var options = {
        host: 'realtime.mbta.com',
        path: '/developer/api/v2/predictionsbystop?api_key=wX9NwuHnZU2ToO7GmGR9uw&stop=2374&format=json',
        method: 'GET'
    };

    var req = http.request(options, (res) => {
        var body = '';

        res.on('data', (d) => {
            body += d;
        });

        res.on('end', function () {
            callback(body);
        });

    });
    req.end();

    req.on('error', (e) => {
        console.error(e);
    });
}

