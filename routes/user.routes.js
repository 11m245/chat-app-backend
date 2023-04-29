import express, { response } from "express";
import * as bcrypt from "bcrypt";
import {
  activateUserInDB,
  addUserInCollection,
  getUserByEmail,
  getUserByObjectId,
  getUserFromActivationToken,
  saveActivationTokenInDB,
  saveLoginTokenInDB,
  saveResetTokenInDB,
} from "../services/user.services.js";
import {
  checkValidSignupData,
  generateHashedPassword,
  generateJWToken,
  mailActivationLink,
  sendResetMail,
} from "../functions/user.routes.functions.js";
import { auth } from "../middlewares/auth.js";

const router = express.Router();
router.use(express.json());

router.post("/signup", async (request, response) => {
  try {
    const data = request.body;
    const user = await getUserByEmail(data.email);
    // console.log("user exit is", user);
    if (user) {
      response
        .status(409)
        .send({ message: "User Already Exist on this Email, try login" });
    } else {
      if (checkValidSignupData(data)) {
        const formattedSignupData = {
          name: data.name,
          mobile: data.mobile,
          email: data.email,
          password: await generateHashedPassword(data.password),
          createdAt: Date.now(),
          isActivated: false,
          isOnline: false,
          lastSeen: Date.now(),
          image: data.image ? data.image : null,
        };

        const addRes = await addUserInCollection(formattedSignupData);
        // console.log("add User Coll Response", addRes);
        if (addRes.insertedId) {
          const addedUser = await getUserByObjectId(addRes.insertedId);
          const activationToken = await generateJWToken(addedUser);
          const saveTokenResult = await saveActivationTokenInDB({
            userId: addedUser._id,
            type: "activation",
            createdAt: Date.now(),
            token: activationToken,
            isExpired: false,
          });

          if (saveTokenResult.insertedId) {
            await mailActivationLink(addedUser, activationToken);
          } else {
            response.status(500).send({ message: "Token Issue" });
          }
          response.send({
            message:
              "User Added, Please use the Activation Link mailed to you for Activation your Login",
          });
        }
      } else {
        response.status(400).send({ message: "Invalid Signup Data" });
      }
    }
  } catch (error) {
    console.log("ERROR CAUGHT in SIGNUP", error);
  }
});

router.post("/activate", async function (request, response) {
  try {
    const { activationtoken } = request.headers;
    // console.log("token", activationtoken);
    const userTokened = await getUserFromActivationToken(activationtoken);
    if (userTokened) {
      const userFromDB = await getUserByObjectId(userTokened.userId);
      if (userFromDB.isActivated === true) {
        response.status(401).send({
          message: "Already Activated User",
        });
      } else {
        const updatedResponse = await activateUserInDB(userFromDB._id);
        // console.log("update respo", updatedResponse);
        if (updatedResponse.modifiedCount > 0) {
          response.status(200).send({
            message: "User Activated",
          });
        } else {
          response.status(500).send({
            message: "User NOT Activated",
          });
        }
      }
    } else {
      response.status(400).send({ message: "token not valid" });
    }
  } catch (err) {
    console.log("ERROR in ACTIVATION", err);
  }
});

router.post("/login", async (req, res) => {
  try {
    const loginData = req.body;
    const userFromDB = await getUserByEmail(loginData.email);
    if (userFromDB) {
      const isPasswordMatch = await bcrypt.compare(
        loginData.password,
        userFromDB.password
      );
      if (isPasswordMatch) {
        if (userFromDB.isActivated === true) {
          const loginToken = await generateJWToken(userFromDB);
          const saveLoginTokenRes = await saveLoginTokenInDB({
            userId: userFromDB._id,
            type: "login",
            createdAt: Date.now(),
            token: loginToken,
            isExpired: false,
          });

          if (saveLoginTokenRes.insertedId) {
            res.status(200).send({
              message: "Login Successfull",
              payload: { token: loginToken, email: userFromDB.email },
            });
          } else {
            res.status(500).send({ message: "Token Issue" });
          }
        } else {
          res
            .status(400)
            .send({ message: "Inactive User, Please Activate your Login " });
        }
      } else {
        res.status(400).send({ message: "Invalid Credentials" });
      }
    } else {
      res.status(400).send({ message: "Invalid Credentials" });
    }
  } catch (err) {
    console.log("ERROR CAUGHT in LOGIN", err);
  }
});

router.get("/verifyEmail", async (req, res) => {
  const { email } = req.headers;
  // console.log("email", email);
  const emailedUser = await getUserByEmail(email);
  if (emailedUser) {
    res.status(200).send({ message: "User Exist" });
  } else {
    res.status(400).send({ message: "User NOT Exist" });
  }
});

router.post("/reset", async (req, res) => {
  try {
    const { email } = req.headers;
    const emailedUser = await getUserByEmail(email);
    if (emailedUser) {
      const resetToken = await generateJWToken(emailedUser);
      const tokenAddRes = await saveResetTokenInDB({
        userId: emailedUser._id,
        type: "reset",
        createdAt: Date.now(),
        token: resetToken,
        isExpired: false,
      });
      // console.log("token add res", tokenAddRes);
      if (tokenAddRes.insertedId) {
        const userResetInfo = { ...emailedUser, resetToken: resetToken };
        await sendResetMail(userResetInfo).catch((err) => console.log(err));
        res.status(200).send({
          message: "Click on Reset Password link has been sent to your email",
        });
      }
    } else {
      res.status(400).send({ message: "User NOT Exist" });
    }
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
});

export default router;
