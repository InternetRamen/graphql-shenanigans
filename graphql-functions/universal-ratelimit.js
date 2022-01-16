const { getGraphQLRateLimiter } = require("graphql-rate-limit");
const rateLimiter = getGraphQLRateLimiter({ identifyContext: (ctx) => ctx.id });

module.exports = async (parent, args, context, info) => {
    const errorMessage = await rateLimiter(
        { parent, args, context, info },
        { max: 5, window: "10s" }
    );
    if (errorMessage) throw new Error(errorMessage);
};
