// Minimal mock satisfying `@dynatrace-sdk/http-client` based client requirements.

const buildMockedFetchResponse = async (data: any) => {
  const response = {
    json: () => data,
    ok: true,
    status: 200,
  };
  return Promise.resolve({
    clone: () => ({
      ...response,
    }),
    ...response,
  });
};

export { buildMockedFetchResponse };
