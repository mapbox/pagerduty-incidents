#!/usr/bin/env node

var Pagerduty = require('..');
var env = require('superenv')('pagerduty');
var optimist = require('optimist');

var argv = optimist
    .options('status', {
        describe: 'Comma-separated list of status types to include',
        demand: true,
        alias: 's'
    })
    .options('names', {
        describe: 'Comma-separated list of PagerDuty service names',
        demand: true,
        alias: 'n'
    })
    .argv;

if (argv.help) return optimist.showHelp();

var pd = new Pagerduty(env.subdomain, env.token, 'https://' + env.subdomain + '.pagerduty.com/api/v1/');

var EventStream = pd.stream({limit: 100, services: {names: 'service A'}}, 10000)
    .on('data', function (incident) {
        console.log('got incident');
        console.log(incident);
    })
    .on('error', function (error) {
        console.log('got error');
        console.log(error);
    })
    .on('end', function () {
        console.log('got end');
    });
