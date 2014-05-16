var Readable = require('stream').Readable;
var _ = require('underscore');
var request = require('request');

var pagerduty = function(subdomain, token) {
    this.subdomain = subdomain;
    this.token = token;
    return this;
};

module.exports = pagerduty;

pagerduty.prototype.stream = function(status, services, interval) {
    var that = this;
    var stream = new Readable({objectMode: true});
    var seen = {};
    var calling = false;

    stream._read = function() {
        if (calling) return;
        query();
    };

    var query = function() {
        calling = true;
        that.getIncidents(status, services, function(err, incidents) {
            if (err) return stream.emit('error', err);
            for (var i = 0; i < incidents.length; i++) {
                var incident = incidents[i];
                if (!seen[incident.id]) {
                    stream.push(incident);
                    seen[incident.id] = true;
                }
            }
            calling = false;
            setTimeout(query, interval || 5000);
        });
    };

    return stream;
};

pagerduty.prototype.getIncidents = function(status, services, cb) {
    if ('string' != typeof status) status = status.toString();
    var that = this;
    // Resolve service names to ids
    this.getServiceIds(services, function(err, ids) {
        if (err) return cb(err);
        var params = {
          url: 'https://' + that.subdomain + '.pagerduty.com/api/v1/incidents',
          json: true,
          headers: {
            'Authorization': 'Token token=' + that.token,
          },
          qs: {
            status: status,
            service: ids.toString()
          },
        };
        request(params, function (err, res, data) {
            if (err) return cb(err);
            if (res.statusCode != 200) {
                return cb(new Error('Bad status code: ' + res.statusCode));
            }
            cb(null, data.incidents);
        });
    });
};

pagerduty.prototype.getServiceIds = function(names, cb) {
    if ('string' == typeof names) names = names.split(',');
    var params = {
        url: 'https://' + this.subdomain + '.pagerduty.com/api/v1/services',
        json: true,
        headers: {
            'Authorization': 'Token token=' + this.token,
        },
    };
    request(params, function (err, res, data) {
        if (err) return cb(err);
        if (res.statusCode != 200) {
            return cb(new Error('Bad status code: ' + res.statusCode));
        }
        var services = data.services;
        if (!services.length) return cb(new Error('No services found.'));
        var ids = _(services).reduce(function(memo, service) {
            if (_(names).indexOf(service.name) !== -1) memo.push(service.id);
            return memo;
        }, []);
        if (!ids.length) return cb(new Error('No matching services found.'));
        cb(null, ids);
    });
};
