var express = require('express');
var bodyParser = require('body-parser');
var requester = require('request');
var app = express();

app.set('port', (process.env.PORT || 5000));
app.set('ip', (process.env.IP || '127.0.0.1'));

// Slack
app.set('slackClientId', (process.env.SLACK_APP_CLIENT_ID || "empty"));
app.set('slackClientSecret', (process.env.SLACK_APP_CLIENT_SECRET || "empty"));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.raw());

app.use(express.static(__dirname + '/public'));

// views is directory for all template files
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.get('/', function(request, response) {
  response.render('pages/index');
});


// API

app.get('/login', function(request, response) {
	var url = 'https://slack.com/oauth/authorize' +
	  '?client_id=' + app.get('slackClientId') +
	  '&scope=bot' +
	  '&state=qombocatoria' +
	  '&redirect_uri=' + 'https://' + app.get('ip') +':'+ app.get('port') + '/oauth';
  console.log('Login redirect to:', url)
	response.redirect(url);
});

app.get('/oauth', function(request, response) {
	var code = request.query.code;

  var options = {
    client_id: app.get('slackClientId'),
    client_secret: app.get('slackClientSecret'),
    code: code
  };

	console.log('Request access token with code:', code)
  request.post('https://slack.com/api/oauth.access', function(error, accessResponse, body) {
      if (!error && accessResponse.statusCode == 200) {
          var json = JSON.parse(body);
          if (json.ok) {
              var auth = json;
              console.log('Oauth testing:', auth)
              request.post('https://slack.com/api/auth.test', function(error, authTestResponse, body) {
                if (!error && accessResponse.statusCode == 200) {
                  // TODO: store `auth.access_token`
                  response.status(200).send('Authenticated');
                }
                else {
                  response.status(500).send(error);
                }
              }).form({token: auth.access_token});
          }
          else {
              console.log('Oauth JSON error:', json.error, json)
              response.status(500).send(json.error);
          }
      }
      else {
          console.log('Oauth error:', error)
          response.status(500).send(error);
      }
  }).form(options);
});

app.post('/slack/message_action/', function(request, response) {
	console.log('Request:', request.body)

	var json = JSON.parse(request.body['payload']);
	console.log('Payload:', json)
	console.log('Answer:', json['actions']['value'])
	console.log('User:', json['user']['id'])
	console.log('Response URL:', json['response_url'])

	var answer = json['actions'][0]['value']
	var message = 'Shame on you!'

	if (answer.toLowerCase() == 'yes') {
		message = 'Estás qombocado!'
	}
	else if (answer.toLowerCase() == 'maybe') {
		message = 'I will hunt you until I get a final answer.'
	}

	requester({ url: json['response_url'], method: 'PUT', json: { text: message }})
	.on('response', function(response) {
    console.log('Response code', response.statusCode)
  })

  response.status(200).send('Analysing your response');
});

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});
