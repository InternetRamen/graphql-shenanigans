const dotenv = require("dotenv");
dotenv.config();
const admin = require("firebase-admin");
const serviceAccount = require("./serviceWorker.json");

const bcrypt = require("bcrypt");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

const {
    ApolloServer,
    ApolloError,
    ValidationError,
    ForbiddenError,
    AuthenticationError,
    gql,
} = require("apollo-server");

const depthLimit = require("graphql-depth-limit");

const typeDefs = require("./schema");

const rateLimit = require("./graphql-functions/universal-ratelimit");

const auth = require("./graphql-functions/auth-token");

const createToken = require("./graphql-functions/create-token");

const validate = require("./graphql-functions/validate");

const resolvers = {
    User: {
        async mainGroup(user) {
            try {
                const mainGroup = await admin
                    .firestore()
                    .collection("groups")
                    .doc(user.mainGroup.id)
                    .get();
                return mainGroup.data();
            } catch (e) {
                throw new ApolloError(e);
            }
        },
        async groups(user) {
            try {
                const userGroups = await admin
                    .firestore()
                    .collection("groups")
                    .where("memberIDs", "array-contains", user.id)
                    .get();
                return userGroups.docs.map((val) => val.data());
            } catch (e) {
                throw new ApolloError(e);
            }
        },
    },
    Group: {
        async owner(group) {
            try {
                const owner = await admin
                    .firestore()
                    .doc(`groups/${group.id}/members/${group.owner.id}`)
                    .get();
                return owner.data();
            } catch (e) {
                throw new ApolloError(e);
            }
        },
        async admins(group) {
            try {
                let admins = [];

                for (let val of group.admins) {
                    const userDoc = await admin
                        .firestore()
                        .collection("groups")
                        .doc(group.id)
                        .collection("members")
                        .doc(val.id)
                        .get();
                    admins.push(userDoc.data());
                }

                return admins;
            } catch (e) {
                throw new ApolloError(e);
            }
        },
        async members(group) {
            try {
                const groupMembers = await admin
                    .firestore()
                    .collection("groups")
                    .doc(group.id)
                    .collection("members")
                    .get();

                return groupMembers.docs.map((val) => val.data());
            } catch (e) {
                throw new ApolloError(e);
            }
        },
        async parties(group) {
            try {
                const groupParties = await admin
                    .firestore()
                    .collection("groups")
                    .doc(group.id)
                    .collection("parties")
                    .get();

                return groupParties.docs.map((val) => val.data());
            } catch (e) {
                throw new ApolloError(e);
            }
        },
    },
    GroupMember: {
        async user(groupMember) {
            try {
                const userDoc = await admin
                    .firestore()
                    .doc(`users/${groupMember.id}`)
                    .get();
                const user = userDoc.data();

                return user;
            } catch (e) {
                throw new ApolloError(e);
            }
        },
        async group(groupMember) {
            try {
                const group = await admin
                    .firestore()
                    .collection("groups")
                    .doc(groupMember.group.id)
                    .get();
                return group.data();
            } catch (e) {
                throw new ApolloError(e);
            }
        },
    },
    Party: {
        async group(party) {
            try {
                const group = await admin
                    .firestore()
                    .collection("groups")
                    .doc(party.group.id)
                    .get();
                return group.data();
            } catch (e) {
                throw new ApolloError(e);
            }
        },
        async attendees(party) {
            try {
                let attendees = [];
                const partyDoc = await admin
                    .firestore()
                    .collection("groups")
                    .doc(party.group.id)
                    .collection("parties")
                    .doc(party.id)
                    .get();
                for (let val of party.attendees) {
                    const userDoc = await admin
                        .firestore()
                        .collection("users")
                        .doc(val.id)
                        .get();
                    attendees.push(userDoc.data());
                }

                return attendees;
            } catch (e) {
                throw new ApolloError(e);
            }
        },
    },
    Query: {
        async user(_, args, context, info) {
            try {
                await auth(context.token, admin);
                await rateLimit(_, args, context, info);
                const userDoc = await admin
                    .firestore()
                    .doc(`users/${args.id}`)
                    .get();
                const user = userDoc.data();
                delete user.auth;
                return user || new ValidationError("User ID not found");
            } catch (e) {
                throw new ApolloError(e);
            }
        },
        async group(_, args, context, info) {
            try {
                await auth(context.token, admin);
                await rateLimit(_, args, context, info);

                const groupDoc = await admin
                    .firestore()
                    .doc(`groups/${args.id}`)
                    .get();
                const group = groupDoc.data();
                return group || new ValidationError("Group ID not found");
            } catch (e) {
                throw new ApolloError(e);
            }
        },
    },
    Mutation: {
        async login(_, args, context, info) {
            try {
                await rateLimit(_, args, context, info);
                let userDoc = await admin
                    .firestore()
                    .collection("users")
                    .where("email", "==", args.email)
                    .limit(1)
                    .get();
                if (userDoc.empty)
                    throw new Error(`Could not find ${args.email}.`);
                userDoc = userDoc.docs.map((val) => val.data());
                if (!userDoc || userDoc.length != 1)
                    throw new Error(`Could not find ${args.email}.`);
                userDoc = userDoc[0];
                const salt = userDoc.auth.salt; // salt to add
                const password = userDoc.auth.password; // should have salt already added
                args.password = salt + args.password; // plaintext
                const isEqual = await bcrypt.compare(args.password, password);
                if (!isEqual)
                    throw new AuthenticationError("Incorrect Password");
                const token = await createToken(
                    admin,
                    userDoc.email,
                    userDoc.id
                );
                return token;
            } catch (e) {
                throw new ApolloError(e);
            }
        },
        async signUp(_, args, context, info) {
            try {
                const salt = [...Array(6)]
                    .map(() => Math.floor(Math.random() * 16).toString(16))
                    .join("");
                const objToAdd = {
                    id: args.username,
                    username: args.username,
                    name: args.name,
                    email: args.email,
                    auth: {
                        password: args.password,
                        salt: salt,
                    },
                    mainGroup: null,
                    groups: [],
                    adminOf: [],
                    ownerOf: [],
                };
                await validate(objToAdd, admin);
                
                objToAdd.auth.password = await bcrypt.hash(salt + objToAdd.auth.password, 10)
                const set = await admin
                    .firestore()
                    .collection("users")
                    .doc(objToAdd.id)
                    .set(objToAdd, { merge: true });
                const token = await createToken(
                    admin,
                    objToAdd.email,
                    objToAdd.id
                );
                return token;
            } catch (e) {
                throw new ApolloError(e);
            }
        },
    },
};

const server = new ApolloServer({
    typeDefs,
    resolvers,
    context: async ({ req }) => ({
        token: req.get("Authorization"),
    }),
    validationRules: [depthLimit(10)],
    introspection: process.env.NODE_ENV !== "production",
    formatError: (err) => {
        if (err.message.startsWith("Database Error: ")) {
            return new Error("Internal server error");
        }
        return err;
    },
});

server.listen().then(({ url }) => {
    console.log(url);
});
