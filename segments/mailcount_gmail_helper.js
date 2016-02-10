var fs = require('fs');
var cp = require('child_process');
var pj = require('path').join;
var DIR = __dirname;
var PIDFILE = pj(DIR,'gmail.pidfile');
var UPDFILE = pj(DIR,'gmail.latest');

function writeThenExit(){
    process.stdout.write('\n');
    process.exit();
}

function spawnDaemon(){
    var out = fs.openSync('gmail.log','a');
    var err = fs.openSync('gmail.err','a');
    var child = cp.spawn('node',['mailcount_gmail_daemon.js'], {detached: true, stdio: ['ignore', out, err], cwd: __dirname});
    child.unref();
    var watcher = fs.watch(__dirname, function(event,filename){
        //console.log(event, filename);
        if(filename === 'gmail.latest'){
            //fs.createReadStream(UPDFILE).pipe(process.stdout).on('end',writeThenExit);
            console.log(fs.readFileSync(UPDFILE,'utf8'));
            watcher.close();
        }
    });
}

// spawn the daemon if it's not running
if(!fs.existsSync(PIDFILE)){
    spawnDaemon();
} else {
    //fs.createReadStream(UPDFILE).pipe(process.stdout).on('end',writeThenExit);
    console.log(fs.readFileSync(UPDFILE,'utf8'));
}
