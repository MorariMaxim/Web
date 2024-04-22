export const redirectTo = (targetUrl, data) => {
  targetUrl += "?";
  for (const key in data) {
    if (Object.hasOwn(data, key)) {
      const value = data[key];
      console.log(`Key: ${key}, Value: ${value}`);
      targetUrl += `&${encodeURIComponent(key)}=${encodeURIComponent(
        JSON.stringify(value)
      )}`;
    }
  }

  window.location.href = targetUrl;
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