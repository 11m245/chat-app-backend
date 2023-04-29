import { client } from "../index.js";

export async function getUserByEmail(newEmail) {
  return await client
    .db("chatApp")
    .collection("users")
    .findOne({ email: newEmail });
}

export async function addUserInCollection(data) {
  return await client.db("chatApp").collection("users").insertOne(data);
}

export async function getUserByObjectId(objId) {
  return await client.db("chatApp").collection("users").findOne({ _id: objId });
}

export async function saveActivationTokenInDB(data) {
  return await client.db("chatApp").collection("userTokens").insertOne(data);
}

export async function saveLoginTokenInDB(data) {
  return await client.db("chatApp").collection("userTokens").insertOne(data);
}

export async function getUserFromActivationToken(activationtoken) {
  // console.log("activ tokens is", activationtoken);
  return await client.db("chatApp").collection("userTokens").findOne({
    isExpired: false,
    type: "activation",
    token: activationtoken,
  });
}

export async function activateUserInDB(objId) {
  await client
    .db("chatApp")
    .collection("userTokens")
    .updateOne(
      { userId: objId, type: "activation", isExpired: false },
      { $set: { isExpired: true } }
    );
  return await client
    .db("chatApp")
    .collection("users")
    .updateOne({ _id: objId }, { $set: { isActivated: true } });
}

export async function saveResetTokenInDB(data) {
  return await client.db("chatApp").collection("userTokens").insertOne(data);
}
