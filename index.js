const express = require('express')
const cors = require('cors')
const mongoose = require('mongoose')
const bodyParser = require('body-parser')
require('dotenv').config()
const app = express()

//Config
mongoose.connect(process.env['MONGO_URI'], {useNewUrlParser: true, useUnifiedTopology: true}, () => { console.log("Connected to Mongo DB")});

const Schema = mongoose.Schema;

//Schemas
const userSchema = new Schema({
  "username": String,  
});

const exerciseSchema = new Schema({
  "userId": { type: String, required: true },
  "username": String,  
  "description": String,
  "duration": Number,
  "date": Date,
});

//Models
const User = mongoose.model('User', userSchema);

const Exercise = mongoose.model('Exercise', exerciseSchema);

//Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors())
app.use(express.static('public'))

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

//Api endpoint
app.post('/api/users', (req, res) => {
  User.find(
    { "username": req.body.username }, 
    (err, userData) =>{
      if(err) {
        console.log("Error: ", err)
      } else {
        if(userData.length === 0) {
          const newUser = new User({
            "username": req.body.username,
          })
  
          newUser.save((err, data) => {
            if(err || !data) {
              res.send("There was an error saving the user!")
            } else {
               res.json(data)
            }
          })
        } else {
          res.send("Username already exists")
        }
      }
  })
});

app.get('/api/users', (req, res) => {
  User.find({}, (err, dataUsers) => {
    if(!dataUsers) {
      res.send("No users")
    } else {
      res.json(dataUsers)
    }
  })
});

app.post('/api/users/:_id/exercises', (req, res) => {
  const checkedId = req.params._id;
  const { description, duration, date } = req.body;
  let checkedDate = new Date(date)
  
  let checkedDateHandler = () => {
    return (checkedDate instanceof Date && !isNaN(checkedDate)) ? checkedDate : checkedDate = new Date();    
  }

  User.findById(checkedId, (err, userData) => {
    checkedDateHandler();
    //console.log(userData);
    if(err || !userData) {
      res.send("Could not find user!");
    } else {
      const newExercise = new Exercise({
        "userId": checkedId,
        "username": userData.username,  
        description,
        duration,
        "date": checkedDate.toDateString(),
      })
//console.log(newExercise);
      newExercise.save((err, data) => {
        if(err || !data) {
          res.send("There was an error saving this exercise");
        } else {
          console.log("Saved Exercise successfully");
          
          res.json({
            "_id": userData._id,
            "username": userData.username,  
            "description": data.description,
            "duration": data.duration,
            "date": data.date.toDateString(),
          });
        }
      });
    }
  })
});

app.get('/api/users/:_id/logs', (req, res) => {
  let { id, from, to, limit } = req.query;
  const checkedId = req.params._id;   
  
  User.findById(checkedId, (err, userData) => {    
    if(err) {
      //console.log("Error with ID! ", err);
      res.send("Could not find user!");
    } else {  
    //$gte ->(start) and $lte ->(end) are comparison operators in MongoDB to select documents where the field value is between specific values

      let dateObj = {}
      if(from) {
        dateObj['$gte'] = new Date(from)
      } 
      if(to) {
        dateObj['$lte'] = new Date(to)
      }
      let filter = {
        userId : checkedId
      }
      if(from || to) {
        filter.date = dateObj
      }  
     
      var queryLog = Exercise.find(filter);
      if(limit){
        queryLog = queryLog.limit(+limit);
      }

        queryLog.exec((err,result) => {
              if(err || !result) {
                res.json([])
              }
              else {
                const count = result.length
                const regLog = result.slice(0,limit)
                const { username, _id} = userData
                const log = regLog.map((item) => ({
                  description: item.description,
                  duration: item.duration,
                  date: item.date.toDateString()
                }));
               
                console.log({ username, count, _id, log });
                res.json({ username, count, _id, log })
              }
            });  
    }
  })
})
   

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
