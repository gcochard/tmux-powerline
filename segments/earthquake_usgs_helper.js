var fs = require('fs');
var cp = require('child_process');
var pj = require('path').join;
var DIR = __dirname;
var PIDFILE = pj(DIR,'usgs.pidfile');
var UPDFILE = pj(DIR,'usgs.latest');
var minMagnitude = process.argv[2];
var out = fs.openSync(pj(__dirname,'usgs.log'),'a');
var err = fs.openSync(pj(__dirname,'usgs.err'),'a');

fs.write(out,'starting up...\n');
fs.write(out,'argument: '+process.argv[2]+'\n');
process.chdir(__dirname);

setTimeout(process.exit,2000);
function writeThenExit(){
    process.stdout.write('\n');
    process.exit();
}

function readLatest(){
    fs.write(out,'reading latest\n');
    var articles = fs.readFileSync(UPDFILE,'utf8').split('\n\n');
    var magnitude = 0;
    var location = '';
    var timestamp;
    var matches;
    // latest is at index 0
    for(var i=0,ii=articles.length; i<ii; i++){
        matches = articles[i].split('\n');
        if(matches){
            magnitude = matches[1];
            location = matches[0];
            timestamp = matches[2]
        }
        if(magnitude >= minMagnitude){
            break;
        }
    }
    if(magnitude >= minMagnitude){
        console.log('%s\n%s\n%s',location,magnitude,Math.floor(timestamp.valueOf()/1000));
    }
    process.exit();

}

function spawnDaemon(){
    var child = cp.spawn('node',['earthquake_usgs_daemon.js'], {detached: true, stdio: ['ignore', out, err], cwd: __dirname});
    child.unref();
    var watcher = fs.watch(__dirname, function(event,filename){
        //console.log(event, filename);
        if(filename === 'usgs.latest'){
            watcher.close();
            readLatest();
        }
    });
}

// spawn the daemon if it's not running
if(!fs.existsSync(PIDFILE)){
    spawnDaemon();
} else {
    //fs.createReadStream(UPDFILE).pipe(process.stdout).on('end',writeThenExit);
    readLatest();
}
