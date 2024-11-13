export const isOneOf = function<T>(x: T, xs: T[]) {
  return xs.some(function(e) {
    return e === x;
  });
};

export const not = function(b: boolean) {
  return !b;
};

function isInteger(value: number) {
  return typeof value === "number" && Number.isInteger(value);
}

export function isValidTimestamp(createdAt: number) {
  if (!isInteger(createdAt)) {
    return false;
  }

  const currentTime = Math.floor(Date.now() / 1000); // Get current server time in seconds
  const oneHourAgo = currentTime - 3600; // 1 hour ago in seconds
  const thirtyMinutesLater = currentTime + 1800; // 30 minutes in the future in seconds

  return createdAt >= oneHourAgo && createdAt <= thirtyMinutesLater;
}

export function parseAmountTag(strAmount: string) {
  // all digit
  if (/^\d+$/.test(strAmount)) {
    return null;
  }

  const parsedInt = parseInt(strAmount);

  // integer
  if (isNaN(parsedInt)) {
    return null;
  }

  // positive
  if (Math.sign(parsedInt) !== 1) {
    return null;
  }

  return parsedInt;
}

export function parseTag(tagName: string, tags: string[][]) {
  const tag = tags.find(function([key, value]) {
    return key === tagName && !!value;
  });

  if (tag) {
    return tag[1];
  }

  return null;
}

export function is32ByteHex(str: string) {
  if (typeof str !== "string") {
    return false;
  }

  // Check if the string has 64 characters (32 bytes in hex)
  if (str.length !== 64) {
    return false;
  }

  // Check if the string is lowercase and hex-encoded
  const hexRegex = /^[a-f0-9]{64}$/;
  return hexRegex.test(str);
}

type Left = { type: symbol, error: string };
type Right = { type: symbol, value: any };

export const Either = {
  _leftSymbol: Symbol("nostrize either left"),
  _rightSymbol: Symbol("nostrize either right"),

  left: function(error: string) {
    return {
      type: Either._leftSymbol,
      error: error
    };
  },
  
  right: function(value: any) {
    return {
      type: Either._rightSymbol,
      value: value
    };
  },

  isLeft: function(either: { type: symbol }): either is Left {
    return either.type === Either._leftSymbol;
  },
  
  isRight: function(either: { type: symbol }): either is Right {
    return either.type === Either._rightSymbol;
  },

  toObject: function(either: Left | Right) {
    return {
      type: either.type.toString(),
      error: Either.isLeft(either) ? either.error : undefined,
      value: Either.isRight(either) ? either.value : undefined
    };
  },

  fromObject: function(obj: { type: string, error: string, value: any }) {
    var type = obj.type,
        error = obj.error,
        value = obj.value;

    return type === Either._leftSymbol.toString()
      ? Either.left(error)
      : Either.right(value);
  },

  getLeft: function(either: Left | Right) {
    if (Either.isLeft(either)) {
      return either.error;
    }
    
    throw new Error("Tried to getLeft from a Right");
  },

  getRight: function(either: Left | Right) {
    if (Either.isRight(either)) {
      return either.value;
    }
    
    throw new Error("Tried to getRight from a Left");
  },

  getOrElseThrow: async function(obj: { eitherFn: () => Promise<Left | Right> }) {
    var eitherFn = obj.eitherFn;
    const either = await eitherFn();

    if (Either.isLeft(either)) {
      throw new Error(Either.getLeft(either));
    }

    return Either.getRight(either);
  },

  getOrElseReject: function(either: Left | Right) {
    return new Promise(function(resolve, reject) {
      if (Either.isLeft(either)) {
        return reject(Either.getLeft(either));
      }

      return resolve(Either.getRight(either));
    });
  }
};
