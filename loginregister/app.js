//importing packages
const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const mongoose = require('mongoose');
const passport = require('passport');
const flash = require('connect-flash');
const session = require('express-session');
const app = express();
const PORT = process.env.PORT || 5000;
// Passport Config
require('./config/passport')(passport);

//Estabilishing connection to db
mongoose.connect(
    'mongodb+srv://mihir:mihir@login.xmfif.mongodb.net/login?retryWrites=true&w=majority',{useNewUrlParser: true ,useUnifiedTopology: true}
  )
  .then(() => console.log('Database mongodb connected'))
  .catch(err => console.log(err));

// EJS
app.use(expressLayouts);
app.set('view engine', 'ejs');
// Express body parser
app.use(express.urlencoded({ extended: true }));
// Express session
app.use(
  session({
    secret: 'secret',
    resave: true,
    saveUninitialized: true
  })
);
// Passport middleware
app.use(passport.initialize());
app.use(passport.session());
// Connect flash
app.use(flash());
// Global variables
app.use(function(req, res, next) {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error');
  next();
});
// Routes
app.use('/', require('./routes/index.js'));
app.use('/users', require('./routes/users.js'));
//chat start
const socketio = require('socket.io');
const cors = require('cors');
const {addUser, removeUser, getUser, getUsersInRoom} = require('./models/users.js');
const server = app.listen(PORT, () => console.log(`Server started on port ${PORT} go to http://localhost:5000/`));//require('http').createServer();
const options = {
    cors:true,
    origins:"https://example.com",
   };
const io = require('socket.io')(server, options);
const router = require('./routes/router')
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
//chat end
