var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var socketCount = 0;

app.use(express.static('public'));

app.get('/', function (req, res) {
	res.sendFile(__dirname + '/views/main.html');
});

io.on('connection', function (socket) {
	socketCount += 1;
	console.log('a user connected, total ' + socketCount);
	

	/*socket.on('getpv', function (options) {
		io.emit('pv', {
			timestamp: new Date(),
			pv: Math.random() * 23 + 18
		});
	});*/

	socket.on('disconnect', function () {
		socketCount -= 1;
		console.log('user disconnected, total ' + socketCount);
	});
});

var server = http.listen(3000, function () {
	var host = server.address().address;
	var port = server.address().port;

	console.log('Started app at %s:%s', host, port);

});

setInterval(function () {
	//console.log('socketCount ' + socketCount);
	if (socketCount > 0) {
		io.emit('pv', {
			timestamp: new Date(),
			pv: Math.random() * 23 + 18,
			mv: Math.random() * 100
		});
	}
}, 750);