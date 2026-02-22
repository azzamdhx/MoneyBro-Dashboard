import { ApolloClient, InMemoryCache, createHttpLink } from "@apollo/client/core";
import { ApolloLink } from "@apollo/client/link";
import { setContext } from "@apollo/client/link/context";
import { ErrorLink } from "@apollo/client/link/error";
import { CombinedGraphQLErrors } from "@apollo/client/errors";
import { Observable } from "rxjs";
import Cookies from "js-cookie";

const httpLink = createHttpLink({
  uri: process.env.NEXT_PUBLIC_API_URL!,
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

let isRefreshing = false;
let pendingRequests: ((token: string) => void)[] = [];

const resolvePendingRequests = (token: string) => {
  pendingRequests.forEach((callback) => callback(token));
  pendingRequests = [];
};

const forceLogout = () => {
  Cookies.remove("token");
  Cookies.remove("refreshToken");
  window.location.href = "/login";
};

const errorLink = new ErrorLink(({ error, operation, forward }) => {
  if (!CombinedGraphQLErrors.is(error)) return;

  const unauthError = error.errors.find(
    (err) =>
      err.extensions?.["code"] === "UNAUTHENTICATED" ||
      err.message.toLowerCase() === "unauthorized"
  );

  if (!unauthError) return;

  const refreshToken = Cookies.get("refreshToken");
  if (!refreshToken) {
    forceLogout();
    return;
  }

  if (isRefreshing) {
    return new Observable<ApolloLink.Result>((observer) => {
      pendingRequests.push((newToken: string) => {
        operation.setContext(({ headers = {} }: { headers: Record<string, string> }) => ({
          headers: { ...headers, authorization: `Bearer ${newToken}` },
        }));
        forward(operation).subscribe({
          next: (val) => observer.next(val),
          error: (err) => observer.error(err),
          complete: () => observer.complete(),
        });
      });
    });
  }

  isRefreshing = true;

  return new Observable<ApolloLink.Result>((observer) => {
    fetch(process.env.NEXT_PUBLIC_API_URL!, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `mutation RefreshToken($refreshToken: String!) {
          refreshToken(refreshToken: $refreshToken) {
            token
            refreshToken
          }
        }`,
        variables: { refreshToken },
      }),
    })
      .then((res) => res.json())
      .then((result) => {
        const data = result?.data?.refreshToken;
        if (data?.token && data?.refreshToken) {
          Cookies.set("token", data.token, { expires: 1, sameSite: "lax", secure: true });
          Cookies.set("refreshToken", data.refreshToken, { expires: 90, sameSite: "lax", secure: true });

          resolvePendingRequests(data.token);

          operation.setContext(({ headers = {} }: { headers: Record<string, string> }) => ({
            headers: { ...headers, authorization: `Bearer ${data.token}` },
          }));

          forward(operation).subscribe({
            next: (val) => observer.next(val),
            error: (err) => observer.error(err),
            complete: () => observer.complete(),
          });
        } else {
          forceLogout();
        }
      })
      .catch(() => {
        forceLogout();
      })
      .finally(() => {
        isRefreshing = false;
      });
  });
});

export const client = new ApolloClient({
  link: errorLink.concat(authLink.concat(httpLink)),
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
