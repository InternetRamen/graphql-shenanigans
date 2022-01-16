const {AuthenticationError} = require("apollo-server")
module.exports = async (token, admin) => {
    if (!token) throw new AuthenticationError("No token provided.");

    let tokenCollect = await admin
        .firestore()
        .collection("tokens")
        .where("token", "==", token)
        .get();
    if (tokenCollect.empty)
        throw new AuthenticationError("Invalid token provided.");
};
