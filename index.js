var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var SerialPort = require('serialport');
var serialport = new SerialPort.SerialPort('/dev/ttyACM0', {
		parser: SerialPort.parsers.readline('\n')
	});

var socketCount = 0;
var cache = {
		timestamp: new Date(),
		pv: 0,
		sp: 0
	};

app.use(express.static('public'));

app.get('/', function (req, res) {
	res.sendFile(__dirname + '/views/main.html');
});

serialport.on('open', function () {
	console.log('serial port open');

	serialport.on('data', function (data) {

		if (data === '!OK') {
			console.log('Command successful');
		} else if (data === '!ERR') {
			console.log('Command failed')
		} else {

			var kvp = data.split(':');

			if (kvp.length === 2) {
				var key = kvp[0].toLowerCase();
				var value = kvp[1];
				var timestamp = new Date();

				// Update cache 
				cache[key] = +value;
				cache.timestamp = timestamp;

				// Save to influxdb

				// Push entire cache to sockets
				if (socketCount > 0) {
					io.emit('values', cache);
				}
			}	
		}
	});
});

io.on('connection', function (socket) {
	socketCount += 1;
	console.log('a user connected, total ' + socketCount);

	// Command to send to arduino
	socket.on('cmd arduino', function (cmd) {

		//TODO: Verify values in cmd
		//TODO: Indicate that command is about to be sent, like isBusy = true
		console.log('cmd arduino', cmd);
		
		serialport.write(cmd.key + cmd.value + '\n', function (err, result) {
			console.log('serial err', err);
			console.log('serial result', result);
		});

	});

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

/*setInterval(function () {
	//console.log('socketCount ' + socketCount);
	if (socketCount > 0) {
		io.emit('pv', {
			timestamp: new Date(),
			pv: Math.random() * 23 + 18,
			mv: Math.random() * 100
		});
	}
}, 750);*/