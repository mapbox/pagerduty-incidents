var Readable = require('stream').Readable;
var _ = require('underscore');
var request = require('request');

var pagerduty = function(subdomain, token) {
    this.subdomain = subdomain;
    this.token = token;
    this.url = 'https://' + subdomain + '.pagerduty.com/api/v1/';
    return this;
};

module.exports = pagerduty;

pagerduty.prototype.callApi = function (url, qs, cb) {
    var returnObject = {};
    var params = {
        url: url,
        json: true,
        headers: {
            'Authorization': 'Token token=' + this.token
        },
        qs: qs
    };
    console.log(params);
    request(params, function (err, res, data) {
        if (err) {
            return cb(err);
        } else if (res.statusCode !== 200) {
            return cb(new Error('Bad status code: ' + res.statusCode));
        } else {
            cb(null, data);
        }
    });
};

pagerduty.prototype.stream = function(options, services, interval) {
    var that = this;
    var stream = new Readable({objectMode: true});
    var seen = {};
    var calling = false;

    stream._read = function () {
        if (calling) return;
        query();
    };

    var query = function () {
        calling = true;
        that.getIncidents(options, services, function(err, data) {
            var incidents = data.incidents;
            if (err) return stream.emit('error', err);
            for (var i = 0; i < incidents.length; i++) {
                var incident = incidents[i];
                if (!seen[incident.id]) {
                    stream.push(JSON.stringify(incident, null, 2));
                    seen[incident.id] = true;
                }
            }
            calling = false;
            setTimeout(query, interval || 5000);
        });
    };

    return stream;
};

pagerduty.prototype.getIncidentNotes = function (ID, cb) {
    var url = this.url + 'incidents/' + ID + '/notes';
    this.callApi(url, '');
};

pagerduty.prototype.getIncidents = function (options, services, cb) {
    console.log('#### getIncidents options ', options, ' services ', services);
    var url = this.url + 'incidents/';
    var qs = {
        'status': 'acknowledged,triggered',
        'sort_by': 'created_on:desc',
        'limit': 3
    };
    _.keys(options).forEach(function (key) {
        switch (key.toString) {
        case 'status':
            if (typeof options[key] != 'string') {
                options[key] = options[key].toString();
            }
            qs.status = options[key];
            break;
        // case 'incident_key':
        //     qs.incident_key = options[key];
        //     break;
        case 'sort_by':
            qs.sort_by = options[key];
            break;
        }
    });

    if (services.names) {
    // Resolve service names to ids
        this.getServices(services.names, function (err, data) {

            var services = data.services;

            if (!services.length) {
                return cb(new Error('No services found.'));
            }

            var ids = _(services).reduce(function (memo, service) {
                if (_(services.names).indexOf(service.name) !== -1) {
                    memo.push(service.id);
                }
                return memo;
            }, []);

            if (!ids.length) {
                return cb(new Error('No matching services found.'));
            }

            if (err) return cb(err);
            qs.service = (typeof ids != 'string') ? ids.toString() : ids;

            this.callApi(url, qs, cb);
        });
    } else {
        qs.service = (typeof services.ids != 'string') ? services.ids.toString() : services.ids;
        this.callApi(url, qs, cb);
    }
};

pagerduty.prototype.getServices = function (names, cb) {
    if (typeof names === 'string') names = names.split(',');
    var url = this.url + 'services';
    var qs = {'limit': 100};
    this.callApi(url, qs, cb);
};
