/* jshint node: true */
'use strict';
var influx = require('influx');
var client = influx({ host: 'localhost', username: 'pi', password: 'ferm', database: 'ferm' });
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var SerialPort = require('serialport');
var serialport = new SerialPort.SerialPort('/dev/ttyACM0', {
		parser: SerialPort.parsers.readline('\n')
	});

var socketCount = 0;
var init = false;
var cache = {
		timestamp: new Date(),
		pv: 0,
		sp: 19.5,
		started: false
	};

var batch = {
	id: 1,
	description: 'Test batch',
	startTime: new Date(),
	active: false
};

// init batch,
	// 'select batchNo/id, description, startTime, logActive,
	//  pidActive from batch.info limit 1'

// init cache,
	// timestamp and pv -> 'select time, value from batch.{id}.pv limit 1'
	// sp -> 'select value from batch.{id}.sp limit 1' (or default 0)

// then open serial port
// when port open, set values on arduino from batch and cache

app.use(express.static('public'));

app.get('/', function (req, res) {
	res.sendFile(__dirname + '/views/main.html');
});

serialport.on('open', function () {
	console.log('serial port open');
	serialport.flush(function () {
		console.log('flushed serial buffer');
	});

	serialport.on('data', function (data) {

		console.log('data', data);

		// Arduino asks for setpoint
		if (data.indexOf('?SP') === 0) {

			serialport.write('SP' + cache.sp.toFixed(1).toString().replace('.', '') + '\n');

		} else if (data.indexOf('?PID') === 0) {

			serialport.write('PID5;10;20\n');

		} else if (data.indexOf('?MODE') === 0) {

			serialport.write('MODEA\n');

		} else if (data.indexOf('!OK') === 0) {
			console.log('Command successful');
		} else if (data.indexOf('!ERR') === 0) {
			console.log('Command failed');
		} else if (data.indexOf('!INIT') === 0) {
			init = true;
		}
		else {

			var kvp = data.split(':');

			// SP:20.00
			// PV:21.10
			// CO:100
			// PID:5.00;10.00;20.00
			// MODE:AUT | MODE:MAN
			if (kvp.length === 2) {
				var key = kvp[0].toLowerCase();
				var value = kvp[1];
				var timestamp = new Date();

				// Update cache
				cache[key] = +value;
				cache.timestamp = timestamp;

				// Save to influxdb, if active
				if (batch.active) {
					client.writePoint('batch.' + batch.id + '.' + key, {
						time: timestamp,
						value: +value
					}, function (err) {
						console.log('Failed to write to influxdb', err);
					});
				}

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
	console.log('a user connected, total ' + socketCount + ', id ' + socket.id);

	// Send current values to the user who just connected
	io.to(socket.id).emit('values', cache);

	// Command to send to arduino
	socket.on('cmd arduino', function (cmd) {

		//TODO: Verify values in cmd
		//TODO: Indicate that command is about to be sent, like isBusy = true
		console.log('cmd arduino', cmd);

		serialport.write(cmd.key + cmd.value + '\n');

		if (batch.active) {
			
			client.writePoint('batch.' + batch.id + '.cmds', {
				time: new Date(),
				cmdKey: cmd.key,
				cmdValue: cmd.value
			}, function (err) {
				console.log('Failed to write to influxdb', err);
			});
		}

	});

	socket.on('disconnect', function () {
		socketCount -= 1;
		console.log('user disconnected, total ' + socketCount + ', id ' + socket.id);
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
