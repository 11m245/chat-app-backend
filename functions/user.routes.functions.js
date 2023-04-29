import * as bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
export function checkValidSignupData(data) {
  const { name, mobile, email, password, cpassword } = data;
  const validStatus =
    name.length > 3 &&
    mobile.length === 10 &&
    email.length > 9 &&
    password.length > 7 &&
    password === cpassword;

  // console.log("isValid input", validStatus);
  return validStatus;
}

export async function generateHashedPassword(plainPassword) {
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(plainPassword, salt);
  return hashedPassword;
}

export async function generateJWToken(userObj) {
  const cObj = { ...userObj, password: 0, isActivated: 0, name: 0, mobile: 0 };
  const token = jwt.sign(
    { date: Date.now(), cObj },
    process.env.JSON_TOKEN_SECRET_KEY
  );
  //   console.log("generatedToken is", token);
  return token;
}

export async function sendMail(mailerData) {
  const { subject, sender, receivers, textContent, htmlContent } = mailerData;
  // console.log("mailer Data", mailerData);
  // create reusable transporter object using the default SMTP transport
  let transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    service: "gmail", //intead port use service gmail
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.NODE_MAILER_MAIL, //  gmail developer email id
      pass: process.env.NODE_MAILER_PW, // generated gmail app password
    },
  });
  // send mail with defined transporter object
  //   const url = `${process.env.CLIENT_URL}/activate/${activationtoken}`;
  let info = await transporter.sendMail({
    from: `${sender.name} <${sender.mailId}>`, // sender address
    to: receivers.join(","), // list of receivers
    subject: subject, // Subject line
    text: textContent, // plain text body
    html: htmlContent, // html body
  });
  console.log("Message sent: %s", info.messageId);
}

export async function mailActivationLink(addedUser, activationToken) {
  const url = `${process.env.CLIENT_API}/activate/${activationToken}`;
  const textContent = `sent by text,Hi ${addedUser.name}, as you have requested to register, use this link to activate your account. ${url}`;
  const htmlContent = `<div > <p>Hi <b>${addedUser.name} </b> as you have requested to register, use this link to activate your account. </p> click this link to <button style="background-color:green;border-radius:10px"> <a href=${url} target="_blank"  style="font-weight:bold;color:white;text-decoration:none">Activate Account</a></button></div>`;
  const receivers = [];
  receivers.push(addedUser.email);
  await sendMail({
    subject: "Activation Link for Chat App",
    sender: {
      name: "Chat App",
      mailId: "sivaraj2siva@gmail.com",
    },
    receivers: receivers,
    textContent: textContent,
    htmlContent: htmlContent,
  });
}

export async function sendResetMail(userResetInfo) {
  // console.log("userResetInfo", userResetInfo);
  const url = `${process.env.CLIENT_API}/change-password/${userResetInfo.resetToken}`;
  const subject = "Password Reset for Chat App";
  const sender = {
    name: "Chat App",
    mailId: "sivaraj2siva@gmail.com",
  };
  const receivers = [];
  receivers.push(userResetInfo.email);
  const textContent = `Hi ${userResetInfo.name}, as you have requested to reset Password, this is the link please click and reset. ${url}`;
  const htmlContent = `<div > <p>Hi ${userResetInfo.name} as you have requested to reset Password, this is the link please click and reset.  ${url} </p> <b>forgot? click this link to reset</b><button style="background-color:green;border-radius:10px"> <a href=${url} target="_blank"  style="font-weight:bold;color:white;text-decoration:none">Reset Password</a></button></div>`;
  const mailerData = { subject, sender, receivers, textContent, htmlContent };
  await sendMail(mailerData);
}
