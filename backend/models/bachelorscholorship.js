const mongoose = require('mongoose');

const ScholarshipSchema = new mongoose.Schema({
  name: String,
  grant: String,
  deadline: String,
  provider: String,
  location: String,
  link: String,
});

const Scholarship = mongoose.model('Scholarship', ScholarshipSchema);
module.exports = Scholarship; // Ensure this line is included
