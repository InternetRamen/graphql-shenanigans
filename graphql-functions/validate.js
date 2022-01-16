
module.exports = async (input, admin) => {

    let regex =
        /^[\w](?!.*?\.{2})[\w.]{1,28}[\w]$/;
    if (input.username.length < 3 || input.username.length > 20) throw new Error("Username must be within 3-20 characters!")
    if (!regex.test(input.username)) throw new Error("Username invalid format or characters")
    if (parseInt(input.username)) throw new Error("Username cannot be a number")
    
    if (!/^[a-zA-Z]+ [a-zA-Z]+$/.test(input.name)) throw new Error("Invalid name")

    if (!/(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/.test(input.email)) throw new Error("Invalid email")
    
    if (input.auth.password.length != 64) throw new Error("Password must be encrypted")

    let userDoc = await admin
        .firestore()
        .collection("users")
        .where("email", "==", input.email)
        .get()
    if (!userDoc.empty) throw new Error("Email in use")

    let checkUser = await admin.firestore()
        .collection("users")
        .where("id", "==", input.username)
        .get()
    if (!checkUser.empty) throw new Error("Username in use");


}