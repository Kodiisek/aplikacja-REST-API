const mongoose = require("mongoose");

const contactSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Set name for contact"],
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
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
    required: true,
  },
});

const Contact = mongoose.model("Contact", contactSchema);

const listContacts = async (ownerId) => {
  return await Contact.find({ owner: ownerId });
};

const getById = async (id, ownerId) => {
  return await Contact.findOne({ _id: id, owner: ownerId });
};

const addContact = async (contact, ownerId) => {
  const newContact = new Contact({ ...contact, owner: ownerId });
  return await newContact.save();
};

const removeContact = async (id, ownerId) => {
  return await Contact.findOneAndDelete({ _id: id, owner: ownerId });
};

const updateContact = async (id, updatedFields, ownerId) => {
  return await Contact.findOneAndUpdate({ _id: id, owner: ownerId }, updatedFields, { new: true });
};

module.exports = {
  listContacts,
  getById,
  addContact,
  removeContact,
  updateContact,
};
