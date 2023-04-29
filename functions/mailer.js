export async function sendMail(mailerData) {
  const { subject, sender, receivers, textContent, htmlContent } = mailerData;
  // console.log("mailer Data", mailerData);
  // create reusable transporter object using the default SMTP transport
  let transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    service: "gmail", //intead port use service gmail
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL, //  gmail email
      pass: process.env.PASS, // generated gmails app password
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
