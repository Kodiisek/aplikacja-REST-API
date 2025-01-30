const express = require('express');
const logger = require('morgan');
const cors = require('cors');
const mongoose = require('mongoose');

const contactsRouter = require('./routes/api/contacts');

const app = express();

const mongoURI = "mongodb+srv://KonradT:mCMRcxJNTYREzHvW@cluster0.jredo.mongodb.net/db-contacts?retryWrites=true&w=majority";

mongoose.connect(mongoURI)
  .then(() => {
    console.log('Database connection successful');
  })
  .catch(err => {
    console.error('Błąd połączenia z MongoDB:', err);
    process.exit(1); // Kończy proces w przypadku błędu połączenia
  });

const formatsLogger = app.get('env') === 'development' ? 'dev' : 'short';

app.use(logger(formatsLogger));
app.use(cors());
app.use(express.json());

app.use('/api/contacts', contactsRouter);

app.use((req, res) => {
  res.status(404).json({ message: 'Not found' });
});

app.use((err, req, res, next) => {
  res.status(500).json({ message: err.message });
});

module.exports = app;

