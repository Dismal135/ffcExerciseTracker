const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
let mongoose = require('mongoose')

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true }).then(()=>{
  console.log("connected")
}).catch((err)=>{
  console.error("fail to connect")
});

const userSchema = new mongoose.Schema({
  username: String
})
const exerciseSchema = new mongoose.Schema({
  user_id: {type: String, required: true},
  description: String,
  duration: Number,
  date: Date
})

const User = mongoose.model('user', userSchema);
const Exercise = mongoose.model('exercise', exerciseSchema);


app.use(cors())
app.use(express.static('public'));
app.use(express.urlencoded({extended: true}));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.get("/api/users", async function (req, res) {
  const users = await User.find({}).select("_id username")
  if (!users) {
    res.send("No users")
  } else {
    res.json(users)
  }
})

app.get("/api/users/:_id/logs",async function (req, res) {
  const { from, to, limit} = req.query;
  const id = req.params._id;
  const user = await User.findById(id);
  if (!user) {
    res.send("Could not find user")
    return;
  }
  let date = {}
  if (from) {
    date["$gte"] = new Date(from)
  }
  if (to) {
    date["$lte"] = new Date(to)
  }
  let exercise = {
    user_id: id
  }

  if (from || to) {
    exercise.date = date
  }

  const exercises = await Exercise.find(exercise).limit(+limit ?? 500)
  const log = exercises.map(e => ({
    description: e.description,
    duration: e.duration,
    date: e.date.toDateString()
  }))
  res.json({
    username: user.username,
    count: exercises.length,
    _id: user._id,
    log
  })
})

app.post("/api/users", async function (req, res) {
  const newUSer = new User({
    username: req.body.username
  })
  try {
    const user = await newUSer.save();
    res.json(user)
  }catch(err) {
    console.log(err)
  }
})

app.post("/api/users/:_id/exercises",async function (req, res) {
  const id = req.params._id
   const {description, duration, date} = req.body;
   try {
    const user = await User.findById(id)
    if (!user) {
      res.send("Could not find user");
    } else {
      const newExercise = new Exercise({
        user_id: user._id,
        description,
        duration,
        date: date ? new Date(date) : new Date()
      })
      const exercise = await newExercise.save()
      res.json({
        _id: user._id,
        username: user.username,
        description: exercise.description,
        duration: exercise.duration,
        date: new Date(exercise.date).toDateString()
      })
    }
   }catch (err) {
    res.send("There was an error saving the exercise")
   }
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
