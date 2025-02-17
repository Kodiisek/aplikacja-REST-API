const sgMail = require('@sendgrid/mail');
const { v4: uuidv4 } = require('uuid');
const Users = require('../models/user'); 

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

async function sendVerificationEmail(userEmail, verificationToken = null) {
  try {
    const user = await Users.findOne({ email: userEmail });
    if (!user) {
      throw new Error('User not found');
    }
    
    if (!verificationToken) {
      verificationToken = uuidv4();
      user.verificationToken = verificationToken;
      await user.save();
    }
    
    const verificationLink = `http://localhost:3000/api/users/verify/${verificationToken}`;

    const msg = {
      to: userEmail, 
      from: 'kodisekk@gmail.com', 
      subject: 'Please verify your email',
      text: `Click on the link to verify your email: ${verificationLink}`,
      html: `<strong>Click on the link to verify your email: <a href="${verificationLink}">${verificationLink}</a></strong>`,
    };

    await sgMail.send(msg);
    console.log('Verification email sent');
  } catch (error) {
    console.error('Error sending email:', error.message);
  }
}


module.exports = sendVerificationEmail;
