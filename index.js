var express = require('express');
var app = express();

app.set('port', (process.env.PORT || 5000));

app.use(express.bodyParser());
app.use(express.static(__dirname + '/public'));

// views is directory for all template files
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.get('/', function(request, response) {
  response.render('pages/index');
});

app.post('/slack/message_action/', function(request, response) {
	console.log('Request:', request.body)
	console.log('Response:', response.body)
	response.sendStatus(200)
});

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});
