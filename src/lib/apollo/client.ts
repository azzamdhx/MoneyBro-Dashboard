import { ApolloClient, InMemoryCache, createHttpLink } from "@apollo/client/core";
import { setContext } from "@apollo/client/link/context";
import Cookies from "js-cookie";

const httpLink = createHttpLink({
  uri: typeof window !== "undefined" ? "/api/graphql" : process.env.NEXT_PUBLIC_API_URL!,
});

const authLink = setContext((_, { headers }) => {
  const token = Cookies.get("token");
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : "",
    },
  };
});

export const client = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          expenses: {
            merge(_, incoming) {
              return incoming;
            },
          },
          installments: {
            merge(_, incoming) {
              return incoming;
            },
          },
          debts: {
            merge(_, incoming) {
              return incoming;
            },
          },
        },
      },
    },
  }),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: "cache-and-network",
    },
  },
});
