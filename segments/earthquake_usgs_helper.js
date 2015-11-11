var fs = require('fs');
var feed = require('feed-read');

var url = "http://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.atom";
var minMagnitude = process.argv[2];

feed(url, function(err, articles) {
    if(err){
        process.exit(1);
    }
    if(!articles.length){
        process.exit(1);
    }
    var magnitude = 0;
    var location = '';
    var timestamp;
    var magRe = /M ([0-9.]+) - (.*)/;
    var matches;
    // latest is at index 0
    for(var i=0,ii=articles.length; i<ii; i++){
        // title is in format "M <magnitude> - <LOCATION>"
        matches = (articles[i].title || '').match(magRe);
        if(matches){
            magnitude = matches[1];
            location = matches[2];
            timestamp = articles[i].published;
        }
        if(magnitude >= minMagnitude){
            break;
        }
    }
    if(magnitude >= minMagnitude){
        console.log('%s\n%s\n%s',location, magnitude, Math.floor(timestamp.valueOf()/1000));
        process.exit(0);
    }
});
