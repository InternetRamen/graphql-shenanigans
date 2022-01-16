const { gql } = require("apollo-server");

module.exports = gql`
    type Query {
        user(id: String!): User
        group(id: String!): Group
        
    }
    type Mutation {
        signUp(
            username: String!
            password: String!
            email: String!
            name: String!
        ): String!
        deleteUser(id: String!): String
        login(email: String!, password: String!): String
    }
    type Auth {
        password: String!
        salt: String!
    }
    type User {
        id: ID!
        username: String!
        name: String!
        auth: Auth
        email: String!
        mainGroup: Group
        groups: [Group]!
        adminOf: [Group]!
        ownerOf: [Group]!
    }
    type Group {
        id: ID!
        name: String!
        owner: GroupMember!
        admins: [GroupMember]!
        members: [GroupMember!]!
        memberIDs: [String!]!
        parties: [Party]!
    }
    type GroupMember {
        id: ID!
        user: User!
        group: Group!
    }
    type Party {
        id: ID!
        name: String!
        group: Group!
        attendees: [User]!
    }
`;
