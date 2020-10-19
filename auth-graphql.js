import { createClient, dedupExchange, cacheExchange, fetchExchange } from 'urql';
import { authExchange } from '@urql/exchange-auth';
import gql from 'graphql-tag';

const addAuthToOperation = ({ authState, operation }) => {
  if (!authState || !authState.idToken) {
    return operation;
  }
  const fetchOptions =
    typeof operation.context.fetchOptions === "function"
      ? operation.context.fetchOptions()
      : operation.context.fetchOptions || {};
  return {
    ...operation,
    context: {
      ...operation.context,
      fetchOptions: {
        ...fetchOptions,
        headers: {
          ...fetchOptions.headers,
          Authorization: authState.idToken,
        },
      },
    },
  };
};

const getAuth = async ({ authState }) => {
  if (!authState) {
    const idToken = localStorage.getItem("idToken");
    const refreshToken = localStorage.getItem("refreshToken");
    if (idToken && refreshToken) {
      return { idToken, refreshToken };
    }
    return null;
  }

  const fetchOptions = {
      method: 'PUT',
      url: 'http://sgp-dev-api.entretenimento.tvglobo.com.br/v1/autenticacao/token',
      headers: {
          'Content-type': 'application/json',
          'x-api-key': 'giHkVZtaKU38ohDOdGfpr8pcpgaNWZe87vm7xAml'
      },
      data: {
          refreshToken: localStorage.getItem('refreshToken')
      }
  }

  const result = await fetch(fetchOptions);

  if (result?.idToken) {
    localStorage.setItem("idToken", result.idToken);
    localStorage.setItem("refreshToken", result.refreshToken);
    return {
      token: result.idToken,
      refreshToken: result.refreshToken,
    };
  }

  localStorage.clear();
  logout();

  return null;
};

const willAuthError = ({ authState }) => {
  if (authState) {
    const dataUser = jwt.decode(authState.idToken);

    if (!dataUser) {
      logout();
    }

    const dateToken = new Date(0);
    const dateRequest = new Date();

    dateToken.setUTCSeconds(dataUser.exp);

    if (dateToken < dateRequest) {
      return true;
    } else {
      return false;
    }
  }

  return true;
};

const run = () => {

  const client = createClient({
    url: '/graphql',
    exchanges: [
      dedupExchange,
      cacheExchange,
      authExchange({
        addAuthToOperation,
        getAuth,
        willAuthError
      }),
      fetchExchange,
    ],
  });

  const query = gql`
    getData() {
      key,
      value
    }
  `;
  
  const result = client.query(query)
  
  console.log(result);
}

run();