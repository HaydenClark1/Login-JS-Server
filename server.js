import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import mysql from 'mysql2';

const app = express();
const port = 8443;

// Middleware
app.use(cors({
  origin: 'https://loginsub.netlify.app',
  methods: ['GET', 'POST', 'DELETE'],
  credentials: true, // Allow cookies or authentication headers to be included
}));
app.use(bodyParser.json()); // Parse JSON request bodies

// MySQL connection setup
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'Soccerball_9', // your MySQL password
  database: 'login-database'
});

db.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL:', err);
  } else {
    console.log('Connected to MySQL');
  }
});

// Email validation function
const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
};

// Password validation function
const validatePassword = (password) => {
  const regex = /^(?=.*[A-Z])(?=.*[\W_]).+$/;
  return regex.test(password);
};


// Endpoints

// Login

app.post('/api/v1/login', (req, res) => {
  const {email, password} = req.body;
  const getQuery = 'SELECT first_name,last_name,id FROM users WHERE email = ? AND password = ?'
   // Ensure that both email and password are valid
   if(!email || !password){
      return res.status(500).json({ error: "Please Fill Out All Areas"});
   }
     // Validate email format
  if (!validateEmail(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }


  db.query(getQuery,[email,password], (err, results) => {
    if (err) {
      return res.status(500).json({ error: "Internal server error" });
    }
   
    // If no results
    if(results.length === 0){
	return res.status(401).json({ error: 'Email or Password Incorrect'});
    }
    const user = results[0];

     //Add user to stats table
     const timestamp = Date.now();
     const date = new Date(timestamp);
     const updateSqlStats = 'UPDATE user_stats SET total_logins = total_logins + 1, last_login = ? WHERE user_id = ?';
     const statValues = [date, user.id];
   
     db.query(updateSqlStats,statValues, (err,results) =>{
         if(err){
           console.error('Error during INSERT operation:', err);
           return res.status(500).json({ error: 'Internal server error' });
         }
     });

    // Return the user's first and last name and id
    
    res.json({ firstName: user.first_name, lastName: user.last_name, id: user.id});
  });
});

//SIGNUP

app.post('/api/v1/user', (req, res) => {
  const { firstName, lastName, email, password } = req.body;
 
  if (!firstName || !lastName || !email || !password) {
	return res.status(500).json({ error: "Please Fill Out All Areas"});
  }

  // Validate email format
  if (!validateEmail(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  // Check if the email already exists
  const checkSql = 'SELECT * FROM users WHERE email = ?';
  db.query(checkSql, [email], (checkErr, checkResults) => {
    if (checkErr) {
      console.error('Error during check operation:', checkErr);
      return res.status(500).json({ error: checkErr.message });
    }

    // Check that password is secure
    if(!validatePassword(password) || password.length < 7){
      return res.status(500).json({ error: "Password should be at least 7 characters long and contain 1 uppercase letter and a special character" });
    }

    // If email already exists, return a specific error message
    if (checkResults.length > 0) {
      return res.status(400).json({ error: 'Email already in use' });
    }

   
    // Proceed with the insert if no duplicates found
    const insertSql = 'INSERT INTO users (first_name, last_name, email, password) VALUES (?, ?, ?, ?)';


    db.query(insertSql, [firstName, lastName, email, password], (insertErr, insertResults) => {
      if (insertErr) {
        console.error('Error during INSERT operation:', insertErr);
        return res.status(500).json({ error: insertErr.message });
      }
      //Add user to stats table
      const timestamp = Date.now();
      const date = new Date(timestamp);
      const insertSqlStats = 'INSERT INTO user_stats (user_id,total_logins, last_login) VALUES (?, ?, ?)';
      const statValues = [insertResults.insertId,1,date || null];
    
      db.query(insertSqlStats,statValues, (err,results) =>{
          if(err){
            console.error('Error during INSERT operation:', err);
            return res.status(500).json({ error: 'Internal server error' });
          }
      });
      res.status(201).json({ id: insertResults.insertId });
    });
  });
});


app.delete('/api/v1/user/:userId', (req, res) => {
  const { userId } = req.params;
  db.query('DELETE FROM users WHERE id = ?', [userId], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.status(204).send();
  });
});

// Stats
app.post('/api/v1/stats', (req, res) => {
  const {userID} = req.body;
  const query = 'SELECT total_logins,last_login FROM user_stats WHERE user_id = ?';
  db.query(query, [userID], (err,results) => {
    if(err){
      return res.status(500).json({error: err.message});
    }
    if(!(results.length > 0)){

    }else{
    const stats = results[0];
    res.status(201).json({total_logins: stats.total_logins, last_login: stats.last_login});
    }
  })
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
