var fs = require('fs');
var feed = require('feed-read');
var reissue = require('reissue');
var util = require('util');

var url = "http://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.atom";
var PIDFILE = 'usgs.pidfile';
var UPDFILE = 'usgs.latest';
var INTERVAL = 1000;
var clone = false;

console.log('daemon started');
if(fs.existsSync(PIDFILE)){
    console.error('Error, daemon already running');
    clone = true;
    process.exit(1);
}
fs.writeFileSync(PIDFILE,process.pid);
process.on('exit',function(){
    console.log('exiting');
    // only delete pidfile if this is the first instance running otherwise,
    // we'll delete it and the next time another instance is spawned, it will
    // be a dupe
    if(!clone){
        try{
        fs.unlinkSync(PIDFILE);
        fs.unlinkSync(UPDFILE);
        } catch(e){
            //no-op
        }
    }
});
process.on('SIGINT',process.exit);
process.on('SIGTERM',process.exit);

var handler = reissue.create({
    func: function(cb){
        feed(url, function(err, articles) {
            if(err){
                console.error(err);
                cb(err);
            }
            if(!articles.length){
                cb(new Error('articles length zero'));
            }
            var magnitude = 0;
            var location = '';
            var timestamp;
            var magRe = /M ([0-9.]+) - (.*)/;
            var matches;
            var data = '';
            // latest is at index 0
            for(var i=0,ii=articles.length; i<ii; i++){
                // title is in format "m <magnitude> - <location>"
                matches = (articles[i].title || '').match(magRe);
                if(matches){
                    magnitude = matches[1];
                    location = matches[2];
                    timestamp = articles[i].published;
                }
                if(magnitude){
                    data += util.format('%s\n%s\n%s\n\n',location,magnitude,Math.floor(timestamp.valueOf()));
                }
            }
            if(data){
                fs.writeFileSync(UPDFILE,data);
            } else {
                fs.writeFileSync(UPDFILE,'');
            }
            cb();
        });
    },
    interval: INTERVAL
});
handler.start(1);
handler.on('error',function(e){
    console.error(e);
});
