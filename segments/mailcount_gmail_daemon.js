var fs = require('fs');
var readline = require('readline');
var google = require('googleapis');
var googleAuth = require('google-auth-library');
var reissue = require('reissue');

var SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];
var TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH ||
    process.env.USERPROFILE) + '/.credentials/';
var TOKEN_PATH = TOKEN_DIR + 'gmail-nodejs-quickstart.json';
var PIDFILE = 'gmail.pidfile';
var UPDFILE = 'gmail.latest';
var INTERVAL = 1000;
var clone = false;

// Set up pidfile, single instance check, and exit handler
if(fs.existsSync(PIDFILE)){
    console.error('Error, daemon already running');
    clone = true;
    process.exit(1);
}
fs.writeFileSync(PIDFILE,process.pid);
process.on('exit',function(){
    // only delete pidfile if this is the first instance running otherwise,
    // we'll delete it and the next time another instance is spawned, it will
    // be a dupe
    if(!clone){
        fs.unlinkSync(PIDFILE);
        fs.unlinkSync(UPDFILE);
    }
});

process.on('SIGINT',process.exit);
process.on('SIGTERM',process.exit);

// Load client secrets from a local file.
var secret = JSON.parse(fs.readFileSync(TOKEN_DIR + 'client_secret.json'));
(function processClientSecrets(content) {
  // Authorize a client with the loaded credentials, then call the
  // Gmail API.
  var handler = reissue.create({
      func: function(cb){
          authorize(content, function(err,auth){
              if(err){
                  cb(err);
              }
              countUnreadInLabel('INBOX',auth,cb);
          });
      },
      interval: INTERVAL
  });
  handler.start(1);
}(secret));

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 *
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
  var clientSecret = credentials.installed.client_secret;
  var clientId = credentials.installed.client_id;
  var redirectUrl = credentials.installed.redirect_uris[0];
  var auth = new googleAuth();
  var oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, function(err, token) {
    if (err) {
      getNewToken(oauth2Client, callback);
    } else {
      oauth2Client.credentials = JSON.parse(token);
      setTimeout(callback.bind(null,null,oauth2Client),0);
    }
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 *
 * @param {google.auth.OAuth2} oauth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback to call with the authorized
 *     client.
 */
function getNewToken(oauth2Client, callback) {
  var authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES
  });
  console.log('Authorize this app by visiting this url: ', authUrl);
  var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  rl.question('Enter the code from that page here: ', function(code) {
    rl.close();
    oauth2Client.getToken(code, function(err, token) {
      if (err) {
        console.log('Error while trying to retrieve access token', err);
        return callback(err);
      }
      oauth2Client.credentials = token;
      storeToken(token);
      return callback(null, oauth2Client);
    });
  });
}

/**
 * Store token to disk be used in later program executions.
 *
 * @param {Object} token The token to store to disk.
 */
function storeToken(token) {
  try {
    fs.mkdirSync(TOKEN_DIR);
  } catch (err) {
    if (err.code != 'EEXIST') {
      throw err;
    }
  }
  fs.writeFile(TOKEN_PATH, JSON.stringify(token));
  console.log('Token stored to ' + TOKEN_PATH);
}

/**
 * Lists the labels in the user's account.
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
function listLabels(auth) {
  var gmail = google.gmail('v1');
  gmail.users.labels.list({
    auth: auth,
    userId: 'me',
  }, function(err, response) {
    if (err) {
      console.log('The API returned an error: ' + err);
      return;
    }
    var labels = response.labels;
    if (labels.length == 0) {
      console.log('No labels found.');
    } else {
      console.log('Labels:');
      for (var i = 0; i < labels.length; i++) {
        var label = labels[i];
        console.log('- %s', label.name);
      }
    }
  });
}

/**
 * Lists the labels in the user's account.
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 * @param {Function} cb the callback
 */
function countUnreadInLabel(label, auth, cb) {
  var gmail = google.gmail('v1');
  gmail.users.labels.get({
    auth: auth,
    id: label,
    userId: 'me',
  }, function(err, response) {
    if (err) {
      console.error('The API returned an error: ' + err);
      return cb(err);
    }
    //console.log("threads: "+response.threadsUnread+', messages: '+response.messagesUnread);
    fs.writeFileSync(UPDFILE,response.threadsUnread);
    //console.log(response.threadsUnread);
    cb(null,response.threadsUnread);
  });
}
