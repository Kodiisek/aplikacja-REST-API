const fs = require('fs').promises;
const path = require('path');

const contactsPath = path.join(__dirname, 'contacts.json');

const listContacts = async () => {
  const data = await fs.readFile(contactsPath, 'utf8');
  return JSON.parse(data);
};

const getById = async (id) => {
  const contacts = await listContacts();
  return contacts.find(contact => contact.id === id);
};

const addContact = async (contact) => {
  const contacts = await listContacts();
  const newContact = { id: Date.now().toString(), ...contact };
  contacts.push(newContact);
  await fs.writeFile(contactsPath, JSON.stringify(contacts, null, 2));
  return newContact;
};

const removeContact = async (id) => {
  let contacts = await listContacts();
  const index = contacts.findIndex(contact => contact.id === id);
  if (index === -1) return null;
  const [deletedContact] = contacts.splice(index, 1);
  await fs.writeFile(contactsPath, JSON.stringify(contacts, null, 2));
  return deletedContact;
};

const updateContact = async (id, updatedFields) => {
  let contacts = await listContacts();
  const index = contacts.findIndex(contact => contact.id === id);
  if (index === -1) return null;
  contacts[index] = { ...contacts[index], ...updatedFields };
  await fs.writeFile(contactsPath, JSON.stringify(contacts, null, 2));
  return contacts[index];
};

module.exports = {
  listContacts,
  getById,
  addContact,
  removeContact,
  updateContact
};
