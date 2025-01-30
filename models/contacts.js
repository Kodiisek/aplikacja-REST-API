const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Set name for contact'],
  },
  email: {
    type: String,
    unique: true,
  },
  phone: {
    type: String,
  },
  favorite: {
    type: Boolean,
    default: false,
  },
});

const Contact = mongoose.model('Contact', contactSchema);

const listContacts = async () => {
  return await Contact.find();
};

const getById = async (id) => {
  return await Contact.findById(id);
};

const addContact = async (contact) => {
  const newContact = new Contact(contact);
  return await newContact.save();
};

const removeContact = async (id) => {
  return await Contact.findByIdAndDelete(id);
};

const updateContact = async (id, updatedFields) => {
  return await Contact.findByIdAndUpdate(id, updatedFields, { new: true });
};

module.exports = {
  listContacts,
  getById,
  addContact,
  removeContact,
  updateContact,
};
