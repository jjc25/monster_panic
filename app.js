//CMPT 470 Technical evaluation Node.js, groupApollo
//Server side application for game, loads files to clients and passes routes messages between
//clients. Also arbitrates scoring by issuing out the points.
//Outstanding items of work are:
//1#-need a way to tell the players who is a robot and who is an enemy.
//need to reset the screen and game players when the points have been given out. ie, the
//robot has eaten all the dots, so we need to fill the maze back up with dots and start the game again
// with the current robot player.
//2#-manage the users, if a user stops playing we need to remove them from the group on the 
//server side. Currently the users are only known on client side.


// Including libraries and connection information to mongodb database
var app = require('http').createServer(handler),
	uriMongoLab = "mongodb://maxwell:Smart99@ds043027.mongolab.com:43027/monster-panic",
	io = require('socket.io').listen(app),
	mongodb = require("mongodb"),
	mongoserver = new mongodb.Server('ds043027.mongolab.com', 43027, {
		auto_reconnect: true
	}),
	db_connector = new mongodb.Db('monster-panic', mongoserver, {}),
	static = require('node-static'); // for serving files

//size of each square in pixels
var gridSize = 30;
var players = 0;
//total number of points in the maze
var points = 408;
//Has robot player been allocated? 1-yes
var whoIsRobot = 0;
var d = new Date();
var lastTime = d.getTime();

//'2' represent a point in the maze, the grid index is read, if 2 give point to player and 
//modify  the grid to '0'
var maze = [
	[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
	[1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1],
	[1, 2, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 2, 1, 1, 2, 1, 1, 1, 2, 1, 2, 1, 1, 1, 2, 1, 1, 2, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 2, 1],
	[1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 2, 1, 1, 1, 2, 1, 2, 1, 1, 1, 2, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1],
	[1, 1, 1, 1, 1, 2, 1, 2, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 1, 1, 2, 1, 2, 1, 1, 1, 1, 1],
	[1, 2, 2, 2, 2, 2, 2, 2, 1, 1, 1, 1, 2, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 2, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 1],
	[2, 2, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 1, 1, 1, 2, 2],
	[1, 2, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 2, 1],
	[1, 2, 2, 2, 2, 2, 2, 2, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 1],
	[1, 1, 2, 1, 1, 1, 1, 2, 2, 2, 2, 1, 2, 1, 1, 2, 1, 2, 1, 1, 1, 1, 1, 2, 1, 2, 1, 1, 2, 1, 2, 2, 2, 2, 1, 1, 1, 1, 2, 1, 1],
	[1, 1, 2, 1, 1, 1, 1, 2, 1, 1, 2, 1, 2, 1, 1, 2, 1, 2, 1, 1, 1, 1, 1, 2, 1, 2, 1, 1, 2, 1, 2, 1, 1, 2, 1, 1, 1, 1, 2, 1, 1],
	[1, 2, 2, 2, 2, 2, 2, 2, 1, 1, 2, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 2, 1, 1, 2, 2, 2, 2, 2, 2, 2, 1],
	[1, 2, 1, 1, 1, 1, 1, 2, 1, 1, 2, 1, 1, 1, 2, 1, 1, 1, 2, 1, 1, 2, 1, 1, 1, 1, 1, 2, 1, 1, 2, 1, 1, 2, 1, 1, 1, 1, 1, 2, 1],
	[2, 2, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 2, 2, 1, 1, 2, 2, 2, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 1, 1, 1, 2, 2],
	[1, 2, 2, 2, 2, 2, 2, 2, 1, 1, 1, 1, 2, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 2, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 1],
	[1, 1, 1, 1, 1, 2, 1, 2, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 1, 1, 2, 1, 2, 1, 1, 1, 1, 1],
	[1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 2, 1, 1, 1, 2, 1, 2, 1, 1, 1, 2, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1],
	[1, 2, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 2, 1, 1, 2, 2, 2, 2, 2, 1, 2, 2, 2, 2, 2, 1, 1, 2, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 2, 1],
	[1, 2, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 2, 1, 1, 2, 1, 1, 1, 2, 1, 2, 1, 1, 1, 2, 1, 1, 2, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 2, 1],
	[1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1],
	[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
];

//make copy of maze, will modify copy while leaving original intact
var mazeClone = [];

for (var i = 0; i < maze.length; i++)
mazeClone[i] = maze[i].slice();

var clients = {};
// This will make all the files in the current folder
// accessible from the web
var fileServer = new static.Server('./');

// This is the port for our web server.
// you will need to go to http://localhost:8080 to see it
app.listen(8080);
//uncomment below for deployment on nodejitsu
//app.listen(80);

// If the URL of the socket server is opened in a browser

function handler(request, response) {

	request.addListener('end', function() {
		fileServer.serve(request, response);
	});
}

// Delete this row if you want to see debug messages
io.set('log level', 1);

// Listen for incoming connections from clients
//the main loop for each client.
//all client message passing and logic code should be in here.
db_connector.open(function(err, db) {
	db.authenticate('maxwell', 'Smart99', function(err, success) {


		io.sockets.on('connection', function(socket) {
			players += 1;
			//console.log("connect who is robot",whoIsRobot);
			//console.log("players",players);
			//send the current state of the maze to the client
			socket.emit('sendMaze', {
				'maze': mazeClone
			});

			socket.on('disconnect', function() {
				// console.log('disconnected ');
				players--;
				if (players == 0) {
					whoIsRobot = 0;
					resetMaze();
				}
			});


			//start game when button pushed
			socket.on('resetGame', function() {
				resetMaze();
				whoIsRobot = 1;
				socket.emit('robot', {
					robot: 1
				})
				socket.broadcast.emit('robot', {
					robot: 0
				})

			})

			var resetMaze = function() {
				for (var i = 0; i < maze.length; i++)
				mazeClone[i] = maze[i].slice();
				socket.emit('sendMaze', {
					'maze': mazeClone
				});
				console.log("resetting maze");

				points = 408;
			}

			// Start listening for mouse move events
			//also checks for dots being eaten and gives the
			//point to the player
			//need to have a way of resetting the board when points=0
			socket.on('xymove', function(data) {

				clients[data.id] = data;
				if (data.robot == 1) {
					var xGrid = data.x;
					var yGrid = data.y;
					xGrid = Math.floor(xGrid / gridSize);
					yGrid = Math.floor(yGrid / gridSize);
					//check if point available,if so send it to player
					if (mazeClone[yGrid][xGrid] == 2) {
						socket.emit('point', {
							'x': xGrid,
							'y': yGrid,
							'players': players
						});
						//		console.log("giving point to "+data.id);
						socket.broadcast.emit('removePoint', {
							'x': xGrid,
							'y': yGrid
						});
						mazeClone[yGrid][xGrid] = 0;
						points -= 1;
						if (points == 0) {
							resetMaze();
						}
					}
				}

				// This line sends the event (broadcasts it)
				// to everyone except the originating client.
				socket.broadcast.emit('xymoving', data);
			});

			//add new player to everyones board
			socket.on('addPlayer', function(data) {
				if (whoIsRobot == 0) {
					socket.emit('robot', {
						robot: 1
					})
					whoIsRobot = 1;
				} else {
					socket.emit('robot', {
						robot: 0
					});
				}
			});


			//catch robot collision to halt play
			//checks time to trap multiple collisions, which cause incorrect
			//behaviour.
			//robot that sent in collision message is turned into monster and
			//colliding monster becomes robot.
			socket.on('collision', function(data) {
				var g = new Date();
				var timeLapsed = (g.getTime() - lastTime);
				lastTime = g.getTime();
				//console.log(timeLapsed);
				if (timeLapsed > 2000) {
					//console.log("collision between"+data.id+" and "+data.other);
					socket.emit('robot', {
						robot: 0,
						move: 'yes'
					});
					socket.broadcast.emit('makeRobot', data);
				}
			});

			//resets board when everyone leaves the game
			socket.on('remove', function() {

			});
		});
	});
});