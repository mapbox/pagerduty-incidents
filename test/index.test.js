'use strict';
var PORT = 3000;
var PagerDutyModule = require('../index.js');
var server  = require('./server.js');
var tape = require('tape');
var expectedNotes = require('./fixtures/expected/notes.js').notes;
var expectedIncidents = require('./fixtures/expected/incidents.js').incidents;
var expectedServices = require('./fixtures/expected/services.json').services;
var PagerDuty = new PagerDutyModule('xxxxx', 'http://localhost:' + PORT + '/');

tape('get incidents for food-source', function (assert) {
    //start server in PORT 3000
    server = server.listen(PORT);
    PagerDuty.getIncidents({limit: 100, services: {names: 'food-source'}}, function (err, incidents) {
        assert.equal(incidents.incidents.length, expectedIncidents.length, 'correct number of incidents found.');
        assert.deepEqual(incidents.incidents, expectedIncidents, 'Output looks as expected');
        assert.end();
    });
});

tape('get services', function (assert) {

    PagerDuty.getServices(function (err, services) {
        assert.ifError(err);
        assert.equal(services.services.length, expectedServices.length);
        assert.end();
    });
});

tape('no incidents exist for a service', function (assert) {

    PagerDuty.getIncidents({limit: 100, services: {names: 'jungle-patrol'}}, function (err, incidents) {
        assert.ifError(err, 'no error');
        assert.equal(incidents.incidents.length, 0, 'no incidents found.');
        assert.end();
    });
});

tape('service does not exist', function (assert) {

    PagerDuty.getIncidents({limit: 100, services: {names: 'idontexist'}}, function (err) {
        assert.equal(err.message, 'No matching services found.');
        assert.end();
    });
});

tape('service does not exist', function (assert) {

    PagerDuty.getIncidents({limit: 100, services: {names: ['food-source','idontexist']}}, function (err, incidents) {
        assert.equal(incidents.incidents.length, 2, 'correct number of incidents found.');
        assert.end();
    });
});

tape('get notes for an incident ID', function (assert) {

    PagerDuty.getIncidentNotes('ABCDEFG', function (err, notes) {
        assert.ifError(err, 'no error');
        assert.deepEqual(notes.notes, expectedNotes, 'output looks okay');
        assert.end();
    });
});

tape('no notes exist for an incident ID', function (assert) {

    PagerDuty.getIncidentNotes('M7E6FRI', function (err, notes) {
        assert.ifError(err, 'no error');
        assert.deepEqual(notes.notes.length, 0, 'no notes found');
        assert.end();
    });
});

tape('call url that does not exist', function (assert) {
    var randomURL = 'http://localhost:' + PORT + '/bugs-bunny';
    var qs = {'i': 'am', 'a': 'cartoon'};

    PagerDuty.callApi(randomURL, qs, function (err) {
        assert.equal(err.message, 'Bad status code: 404');
        server.close();
        assert.end();
    });
});
