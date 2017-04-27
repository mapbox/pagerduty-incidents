'use strict';
var Readable = require('stream').Readable;
var request = require('request');

var pagerduty = function (token, url) {
    this.token = token;
    this.url = url;
    return this;
};

module.exports = pagerduty;

pagerduty.prototype.stream = function (options, interval) {
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
        that.getIncidents(options, function (err, data) {
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

pagerduty.prototype.callApi = function (url, qs, cb) {
    var params = {
        url: url,
        json: true,
        headers: {
            'Authorization': 'Token token=' + this.token
        },
        qs: qs
    };
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

pagerduty.prototype.getIncidentNotes = function (id, cb) {
    var url = this.url + 'incidents/' + id + '/notes';
    this.callApi(url, '', function (err, data) {
        if (err) {
            console.log(err);
            cb(err);
        } else {
            cb(null, data);
        }
    });

};

pagerduty.prototype.getIncidents = function (options, cb) {
    var url = this.url + 'incidents/';
    var that = this;

    var qs = {
        'status': 'acknowledged,triggered,resolved',
        'sort_by': 'created_on:desc',
        'limit': 100
    };

    Object.keys(options).forEach(function (key) {
        switch (key.toString()) {
        case 'status':
            if (typeof options[key] != 'string') {
                options[key] = options[key].toString();
            }
            qs.status = options[key];
            break;
        case 'incident_key':
            qs.incident_key = options[key];
            break;
        case 'sort_by':
            qs.sort_by = options[key];
            break;
        }
    });

    if (options.services.names) {
    // Resolve service names to ids
        this.getServices(function (err, data) {
            var ids = data['services'].reduce(function (memo, service) {
                if (options.services.names.indexOf(service.name) !== -1) {
                    memo.push(service.id);
                }
                return memo;
            }, []);

            if (!ids.length) {
                return cb(new Error('No matching services found.'));
            }

            if (err) return cb(err);
            qs.service = (typeof ids != 'string') ? ids.toString() : ids;
            that.callApi(url, qs, cb);
        });
    } else {
        qs.service = (typeof options.services.ids != 'string') ? options.services.ids.toString() : options.services.ids;
        this.callApi(url, qs, cb);
    }
};

pagerduty.prototype.getServices = function (cb) {
    var url = this.url + 'services';
    var qs = {'limit': 100};
    this.callApi(url, qs, cb);
};
