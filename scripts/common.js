export const redirectTo = (targetUrl, data) => {
  let queryParams = new URLSearchParams();

  for (const key in data) {
    queryParams.append(key, data[key]);
  }

  console.log(`targetUrl?${queryParams.toString()}`);

  window.location.href = `${targetUrl}?${queryParams.toString()}`;
};

export function waitForCondition(condition, interval) {
  return new Promise((resolve) => {
    const checkCondition = () => {
      if (condition()) {
        resolve();
      } else {
        setTimeout(checkCondition, interval);
      }
    };

    checkCondition();
  });
}
