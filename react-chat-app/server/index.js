const express = require('express');
var app = express()

const {addUser, removeUser, getUser, getUsersInRoom} = require('./users.js');

const PORT = process.env.port || 5000;

const socketio = require('socket.io');
const cors = require('cors');

const server = require('http').createServer();
const options = {
    cors:true,
    origins:"https://example.com",
   };
const io = require('socket.io')(server, options);
server.listen(PORT, () => console.log(`Server has started on ${PORT}....`));

const router = require('./router')

io.on('connection', (socket) => {

    console.log('We have a new connection');

    socket.on('join', ({name, room}, callback) => {
        const { error , user} = addUser({id: socket.id, name, room });
        console.log(user.name, user.room);

       if(error) return callback(error);
        socket.emit('message', {user : 'admin', text: `${user.name}, welcome to the room ${user.room}`});
        socket.broadcast.to(user.room).emit('message', {user : 'admin', text: `${user.name}, has joined`});
        socket.join(user.room);
        io.to(user.room).emit('roomData', { room : user.room, users : getUsersInRoom(user.room)})
        callback();
    });

    socket.on('sendMessage', (message, callback)=> {
        const user = getUser(socket.id);

        io.to(user.room).emit('message', { user : user.name, text : message})
        io.to(user.room).emit('roomData', { room : user.room, users : getUsersInRoom(user.room)})

        callback();
    })

    socket.on('disconnect', () => {
        const user = removeUser(socket.id);
        if(user) {
            io.to(user.room).emit('message', { user : 'admin', text : `${user.name} has left `})
        }
    })
})

app.use(router);

