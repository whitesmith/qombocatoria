var express = require('express');
var bodyParser = require('body-parser');
var requester = require('request');
var app = express();

app.set('port', (process.env.PORT || 5000));

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

app.post('/slack/message_action/', function(request, response) {
	console.log('Request:', request.body)

	var json = JSON.parse(request.body['payload']);
	console.log('Payload:', json)
	console.log('Answer:', json['actions']['value'])
	console.log('User:', json['user']['id'])
	console.log('Response URL:', json['response_url'])

	requester({ url: json['response_url'], method: 'PUT', json: { text: 'Estás qombocado!' }})
	.on('response', function(response) {
    console.log('Response code', response.statusCode)
  })

  response.sendStatus(200)
});

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});
