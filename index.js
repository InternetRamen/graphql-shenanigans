const admin = require("firebase-admin")
const serviceAccount = require("./serviceWorker.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

const { ApolloServer, ApolloError, ValidationError, gql } = require("apollo-server")

const typeDefs = gql`
    type Person {
        firstName: String!
        lastName: String!
        id: ID!
    }
    type Query {
        person(id: String!): Person
    }
`;

const resolvers = {
    Query: {
        async person(_, args) {
            try {
                const personDoc = await admin
                    .firestore()
                    .doc(`people/${args.id}`)
                    .get();
                const person = personDoc.data();
                return person || new ValidationError("User ID not found");
            } catch (e) {
                throw new ApolloError(e);
            }
        },
    },
};

const server = new ApolloServer({
    typeDefs,
    resolvers
})

server.listen().then(({url}) => {
    console.log(url)
})