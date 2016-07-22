var express = require('express');
var bodyParser = require('body-parser');
var requester = require('request');
var app = express();
var redis = require('redis').createClient(process.env.REDIS_URL || 'redis://127.0.0.1:6379');

app.set('port', (process.env.PORT || 5000));
app.set('ip', (process.env.IP || '127.0.0.1'));

// Slack
app.set('slackClientId', (process.env.SLACK_APP_CLIENT_ID || 'empty'));
app.set('slackClientSecret', (process.env.SLACK_APP_CLIENT_SECRET || 'empty'));
// Auth
app.set('oauthRedirectURL', (process.env.OAUTH_REDIRECT_URL || 'http://127.0.0.1:' + app.get('port') + '/oauth'));

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
	  '&redirect_uri=' + app.get('oauthRedirectURL');
  console.log('Login redirect to:', url)
	response.redirect(url);
});

app.get('/oauth', function(request, response) {
	var code = request.query.code;

  var options = {
    client_id: app.get('slackClientId'),
    client_secret: app.get('slackClientSecret'),
    code: code,
    redirect_uri: app.get('oauthRedirectURL')
  };

	console.log('Request access token with options:', options)
  requester.post('https://slack.com/api/oauth.access', function(error, accessResponse, body) {
      if (!error && accessResponse.statusCode == 200) {
          var json = JSON.parse(body);
          if (json.ok) {
              var auth = json;
              console.log('Oauth testing:', auth)
              requester.post('https://slack.com/api/auth.test', function(error, authTestResponse, body) {
                if (!error && accessResponse.statusCode == 200) {
                  // Store `auth.access_token`
                  redis.hset("Auth", "access_token", auth.access_token);
                  redis.hset("Auth", "bot_user_id", auth.bot.bot_user_id);
                  redis.hset("Auth", "bot_access_token", auth.bot.bot_access_token);
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

app.get('/slack/bot/test/', function(request, response) {
	redis.hget("Auth", "bot_access_token", function(error, access_token) {
		if (access_token == null) {
			response.status(403).send('Not authenticated');
		}
		else if (access_token == undefined) {
			response.sendStatus(500);
		}
		else {
			var url = 'https://slack.com/api/chat.postMessage' +
			  '?token=' + access_token +
			  '&channel=' + (request.query.sendTo || 'C1TPEHDEX') + //TODO: Qombocatoria
			  '&pretty=1' +
			  '&text=' + encodeURIComponent(request.query.text || 'Test from backend!') +
			  '&as_user=' + 'B1TQJMBEX'; //TODO: Bot user

			console.log('Bot test message', url);

		  requester.get(url, function(error, botResponse, body) {
		    if (!error && botResponse.statusCode == 200) {
		      response.status(200).send('Test message sent successfully');
		    }
		    else {
		      response.status(botResponse.statusCode).send(error);
		    }
		  })
		}
	});
})

app.post('/slack/message_action/', function(request, response) {
	console.log('Request:', request.body)

	var json = JSON.parse(request.body['payload']);
	console.log('Payload:', json)
	console.log('Answer:', json['actions']['value'])
	console.log('User:', json['user']['id'])
	console.log('Response URL:', json['response_url'])

	var answer = json['actions'][0]['value']
	var message = 'Shame on you!'

	if (answer.toLowerCase() == 'yes' || answer.toLowerCase() == 'sure') {
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
