const saltRounds = 10
const bcrypt = require("bcrypt")
const {v5: uuidv5} = require("uuid") 
module.exports = async (admin, email, id) => {
    let token = uuidv5(email, "253f95dd-bc62-4983-ba3c-97706a4786fa");

    token = await bcrypt.hash(token, saltRounds);
    token = "pear_" + token;
    const activeDoc = await admin
        .firestore()
        .collection("tokens")
        .doc(id);
    await activeDoc.set({
        id: id,
        token: token,
        createdAt: admin.firestore.Timestamp.now(),
    });

    return token;
}