A readable stream for PagerDuty incidents

## Usage

As a readable stream:

```javascript
var Pagerduty = require('pagerduty');
var pd = new Pagerduty('mySubdomain', 'myToken');

var EventStream = pd.stream(['triggered'], ['ServiceA', 'ServiceB'], 10000)
    .on('data', function(incident) {
        console.log('got incident');
        console.log(incident);
    })
    .on('error', function(error) {
        console.log('got error');
        console.log(error);
    })
    .on('end', function() {
        console.log('got end');
    });
```


