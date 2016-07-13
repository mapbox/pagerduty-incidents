'use strict';

var express = require('express');
var app = express();
var services = require('./fixtures/services.json');
var incidents = require('./fixtures/incidents.json');
var notes = require('./fixtures/notes.json');

app.get('/incidents', function (req, res) {
    var filteredIncidents = {incidents: []};
    var goodToFilter = true;
    incidents.incidents.forEach(function (incident) {
        goodToFilter = true;
        if (req.query.status) {
            var status = req.query.status.split(',');
            goodToFilter = (status.indexOf(incident.status) > -1) && goodToFilter;
        }
        if (req.query.service) {
            var services = req.query.service.split(',');
            goodToFilter = (services.indexOf(incident.service.id) > -1) && goodToFilter;
        }
        if (req.query.incident_key) {
            goodToFilter = (req.query.incident_key === incident.incident_key) && goodToFilter;
        }
        if (goodToFilter) {
            filteredIncidents.incidents.push(incident);
        }
    });
    res.status(200).send(filteredIncidents);
    res.end();
});

app.get('/incidents/:id/notes', function (req, res) {
    var filteredNotes = {'notes': []};
    if (req.params.id) {
        notes.notes.forEach(function (note) {
            if (note.id === req.params.id) {
                filteredNotes.notes.push(note);
            }
        });
        res.status(200).send(filteredNotes);
        res.end();
    } else {
        res.status(401).send('Please provide an ID');
        res.end();
    }
});

app.get('/services/', function (req, res) {
    res.status(200).send(services);
    res.end();
});
module.exports = app;
