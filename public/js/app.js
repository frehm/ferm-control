function ViewModel() {
	var socket = io(),
		self = this;

	this.testValue = ko.observable('inital value');
	this.timestamp = ko.observable(new Date());
	this.temperature = ko.observable(0);
	this.setpoint = ko.observable(0);
	this.output = ko.observable(0);
	this.statusText = ko.observable('Fermentation started 3 days ago');
	this.modeText = ko.observable('Started');

	// Connection state
	this.connected = ko.observable(true);
	this.reconnecting = ko.observable(false);

	// Command state
	this.sending = ko.observable(false);

	
	// Process values pushed from raspberry pi
	socket.on('values', function (data) {
		self.timestamp(data.timestamp);
		self.temperature(data.pv);
		self.setpoint(data.sp);
		//self.output(data.mv);
		console.log('new values', data);
	});

	// Commands sent to raspberry pi
	this.changeSetpoint = function (newSp) {
		
		var test = self.setpoint() + 10;
		
		var cmd = {
			key: 'SP',
			value: test.toFixed(1).toString().replace('.', '')
		};
		socket.emit('cmd arduino', cmd);
	};

	// Connection state
	socket.on('connect', function () {
		self.connected(true);
		self.reconnecting(false);
		console.log('connected');
	});

	socket.on('error', function (err) {
		console.log('connection error', err);
	});

	socket.on('disconnect', function () {
		console.log('disconnected');
		self.connected(false);
		self.reconnecting(false);
	});

	socket.on('reconnect', function (attempt) {
		console.log('reconnected', attempt);
		self.connected(true);
		self.reconnecting(false);
	});

	socket.on('reconnect_error', function (err) {
		console.log('reconnect error', err);
	});

	socket.on('reconnecting', function (attempt) {
		console.log('reconnecting', attempt);
		self.reconnecting(true);
	});
	
}

ko.applyBindings(new ViewModel());