import { AbstractProvider } from "web3-core";

export const advanceTime = (time: number) => {
  return new Promise((resolve, reject) => {
    (web3.currentProvider as AbstractProvider)?.send?.(
      {
        jsonrpc: "2.0",
        method: "evm_increaseTime",
        params: [time],
        id: new Date().getTime(),
      },
      (err, result) => {
        if (err) {
          return reject(err);
        }
        return resolve(result);
      }
    );
  });
};
